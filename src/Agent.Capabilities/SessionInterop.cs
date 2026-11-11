using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>
/// Ponte de sessão para o modo SERVIÇO (sessão 0). Um Serviço do Windows roda isolado da área de
/// trabalho do usuário, então SystemParametersInfo não altera o wallpaper de quem está logado.
/// Aqui: pegamos o token do usuário da sessão de console ativa, gravamos o wallpaper no HKCU DELE
/// (via HKEY_USERS\{SID}) e disparamos a atualização DENTRO da sessão dele com CreateProcessAsUser.
/// Requer que o Agent rode como LocalSystem (o Serviço roda) — só assim WTSQueryUserToken funciona.
/// </summary>
internal static class SessionInterop
{
    /// <summary>Session do processo atual == console ativa? (console/dev = sim; Serviço em sessão 0 = não).</summary>
    public static bool InActiveUserSession()
    {
        uint active = WTSGetActiveConsoleSessionId();
        uint mine = (uint)System.Diagnostics.Process.GetCurrentProcess().SessionId;
        return active != 0xFFFFFFFF && mine == active;
    }

    /// <summary>Aplica o wallpaper para o usuário da sessão de console ativa (a partir da sessão 0).</summary>
    public static (bool ok, string? error) ApplyWallpaperForActiveUser(string path, string styleFill = "10", string tile = "0")
    {
        uint session = WTSGetActiveConsoleSessionId();
        if (session == 0xFFFFFFFF)
            return (false, "Nenhuma sessão de usuário ativa (ninguém logado no console).");

        if (!WTSQueryUserToken(session, out var hToken) || hToken == IntPtr.Zero)
            return (false, "Não foi possível obter o token do usuário logado.");

        var hDup = IntPtr.Zero;
        var env = IntPtr.Zero;
        try
        {
            if (!DuplicateTokenEx(hToken, MAXIMUM_ALLOWED, IntPtr.Zero, SecurityImpersonation, TokenPrimary, out hDup) || hDup == IntPtr.Zero)
                return (false, "Falha ao duplicar o token do usuário.");

            var sid = GetTokenSid(hDup);
            if (sid is null)
                return (false, "Não foi possível identificar o usuário logado.");

            // Grava o wallpaper no HKCU do usuário logado (HKEY_USERS\{SID}, hive já carregado).
            using (var key = Registry.Users.OpenSubKey($@"{sid}\Control Panel\Desktop", writable: true))
            {
                if (key is null) return (false, "Registro do usuário logado indisponível.");
                key.SetValue("Wallpaper", path, RegistryValueKind.String);
                key.SetValue("WallpaperStyle", styleFill, RegistryValueKind.String);
                key.SetValue("TileWallpaper", tile, RegistryValueKind.String);
            }

            // Dispara a atualização DENTRO da sessão do usuário (recarrega os parâmetros por-usuário).
            CreateEnvironmentBlock(out env, hDup, false);
            var rundll = Path.Combine(Environment.SystemDirectory, "rundll32.exe");
            var cmd = new StringBuilder("rundll32.exe user32.dll,UpdatePerUserSystemParameters 1, True");
            var si = new STARTUPINFO { cb = Marshal.SizeOf<STARTUPINFO>(), lpDesktop = @"winsta0\default" };

            uint flags = CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW;
            if (!CreateProcessAsUser(hDup, rundll, cmd, IntPtr.Zero, IntPtr.Zero, false, flags, env, null, ref si, out var pi))
                return (false, $"Registro gravado, mas não foi possível atualizar a tela (erro {Marshal.GetLastWin32Error()}). O wallpaper aparece no próximo login.");

            CloseHandle(pi.hThread);
            CloseHandle(pi.hProcess);
            return (true, null);
        }
        finally
        {
            if (env != IntPtr.Zero) DestroyEnvironmentBlock(env);
            if (hDup != IntPtr.Zero) CloseHandle(hDup);
            CloseHandle(hToken);
        }
    }

    private static string? GetTokenSid(IntPtr token)
    {
        GetTokenInformation(token, TokenUser, IntPtr.Zero, 0, out var len);
        if (len == 0) return null;
        var buf = Marshal.AllocHGlobal((int)len);
        try
        {
            if (!GetTokenInformation(token, TokenUser, buf, len, out _)) return null;
            var tu = Marshal.PtrToStructure<TOKEN_USER>(buf);
            if (!ConvertSidToStringSid(tu.User.Sid, out var sidPtr)) return null;
            try { return Marshal.PtrToStringUni(sidPtr); }
            finally { LocalFree(sidPtr); }
        }
        finally { Marshal.FreeHGlobal(buf); }
    }

    // ---------- P/Invoke ----------
    private const int TokenUser = 1;
    private const uint MAXIMUM_ALLOWED = 0x02000000;
    private const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400, CREATE_NO_WINDOW = 0x08000000;
    private const int SecurityImpersonation = 2, TokenPrimary = 1;

    [StructLayout(LayoutKind.Sequential)]
    private struct SID_AND_ATTRIBUTES { public IntPtr Sid; public uint Attributes; }
    [StructLayout(LayoutKind.Sequential)]
    private struct TOKEN_USER { public SID_AND_ATTRIBUTES User; }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION { public IntPtr hProcess, hThread; public uint dwProcessId, dwThreadId; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO
    {
        public int cb;
        public string? lpReserved, lpDesktop, lpTitle;
        public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
        public short wShowWindow, cbReserved2;
        public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
    }

    [DllImport("kernel32.dll")] private static extern uint WTSGetActiveConsoleSessionId();
    [DllImport("wtsapi32.dll", SetLastError = true)] private static extern bool WTSQueryUserToken(uint sessionId, out IntPtr token);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool CloseHandle(IntPtr h);

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool DuplicateTokenEx(IntPtr existing, uint access, IntPtr attrs, int impLevel, int tokenType, out IntPtr newToken);

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern bool GetTokenInformation(IntPtr token, int cls, IntPtr info, uint len, out uint retLen);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool ConvertSidToStringSid(IntPtr sid, out IntPtr str);

    [DllImport("kernel32.dll")] private static extern IntPtr LocalFree(IntPtr p);

    [DllImport("userenv.dll", SetLastError = true)] private static extern bool CreateEnvironmentBlock(out IntPtr env, IntPtr token, bool inherit);
    [DllImport("userenv.dll", SetLastError = true)] private static extern bool DestroyEnvironmentBlock(IntPtr env);

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CreateProcessAsUser(
        IntPtr token, string? appName, StringBuilder? cmdLine, IntPtr procAttrs, IntPtr threadAttrs,
        bool inherit, uint flags, IntPtr env, string? curDir, ref STARTUPINFO si, out PROCESS_INFORMATION pi);
}
