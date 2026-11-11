using System.Diagnostics;
using System.Text;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>
/// Executa um processo do Windows com argumentos FIXOS (nunca string de usuário) e transmite
/// stdout/stderr linha a linha. É o mecanismo por trás das capacidades baseadas em CLI do
/// sistema (sfc, dism, ipconfig, netsh, gpupdate…). Os args são definidos em código, não vêm
/// do manifesto nem da IA — mantendo o invariante de segurança.
/// </summary>
public static class ProcessRunner
{
    public sealed record Result(int ExitCode, string Output);

    public static async Task<Result> RunAsync(
        string fileName,
        string arguments,
        ICapabilityProgress? progress,
        CancellationToken ct,
        string? standardInput = null,
        TimeSpan? timeout = null)
    {
        using var proc = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = fileName,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                RedirectStandardInput = standardInput is not null,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8,
            },
            EnableRaisingEvents = true,
        };

        var sb = new StringBuilder();
        void OnData(object _, DataReceivedEventArgs e)
        {
            if (e.Data is null) return;
            lock (sb) sb.AppendLine(e.Data);
            progress?.Log(e.Data);
        }

        proc.OutputDataReceived += OnData;
        proc.ErrorDataReceived += OnData;

        if (!proc.Start())
            throw new InvalidOperationException($"Falha ao iniciar {fileName}");

        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();

        if (standardInput is not null)
        {
            await proc.StandardInput.WriteAsync(standardInput);
            await proc.StandardInput.FlushAsync(ct);
            proc.StandardInput.Close();
        }

        using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct);
        if (timeout is { } t) linked.CancelAfter(t);

        try
        {
            await proc.WaitForExitAsync(linked.Token);
        }
        catch (OperationCanceledException)
        {
            TryKill(proc);
            throw;
        }

        return new Result(proc.ExitCode, sb.ToString());
    }

    private static void TryKill(Process proc)
    {
        try { if (!proc.HasExited) proc.Kill(entireProcessTree: true); }
        catch { /* best-effort */ }
    }

    /// <summary>Caminho absoluto de um executável em System32 (evita depender do PATH).</summary>
    public static string System32(string exe) =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), exe);
}
