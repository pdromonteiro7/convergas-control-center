using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace ConvergasControl.Agent.Capabilities;

/// <summary>
/// system.setWallpaper — gera um papel de parede da marca Convergas e o aplica no Windows.
/// Na sessão do usuário (console/dev) aplica direto via SystemParametersInfo. Como SERVIÇO
/// (sessão 0), aplica no HKCU do usuário logado e atualiza a tela dentro da sessão dele
/// (SessionInterop).
/// </summary>
public sealed class SetWallpaperCapability : ICapability
{
    public string Id => "system.setWallpaper";

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
    private const int SPI_SETDESKWALLPAPER = 0x0014, SPIF_UPDATEINIFILE = 0x01, SPIF_SENDCHANGE = 0x02;

    public Task<CapabilityResult> ExecuteAsync(CapabilityContext ctx, CancellationToken ct)
    {
        try
        {
            ctx.Progress.Stage(10, "Gerando papel de parede da marca…");
            var dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "ConvergasControl", "assets");
            Directory.CreateDirectory(dir);
            var path = Path.Combine(dir, "wallpaper.jpg");
            Generate(path);

            // Sessão do usuário (console/dev): aplica direto.
            if (SessionInterop.InActiveUserSession())
            {
                using (var key = Registry.CurrentUser.OpenSubKey(@"Control Panel\Desktop", writable: true))
                {
                    key?.SetValue("WallpaperStyle", "10"); // preencher
                    key?.SetValue("TileWallpaper", "0");
                }
                SystemParametersInfo(SPI_SETDESKWALLPAPER, 0, path, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE);
                return Task.FromResult(CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true, ["path"] = path, ["mode"] = "sessão do usuário" }));
            }

            // Modo Serviço (sessão 0): aplica na sessão do usuário logado.
            ctx.Progress.Stage(60, "Aplicando na sessão do usuário logado…");
            var (ok, error) = SessionInterop.ApplyWallpaperForActiveUser(path);
            if (!ok)
            {
                if (!string.IsNullOrWhiteSpace(error)) ctx.Progress.Log(error!);
                return Task.FromResult(CapabilityResult.Failure(CommonErrors.Unexpected));
            }
            return Task.FromResult(CapabilityResult.Success(new Dictionary<string, object?> { ["ok"] = true, ["path"] = path, ["mode"] = "serviço → usuário logado" }));
        }
        catch
        {
            return Task.FromResult(CapabilityResult.Failure(CommonErrors.Unexpected));
        }
    }

    private static void Generate(string path)
    {
        using var bmp = new Bitmap(1920, 1080);
        using var g = Graphics.FromImage(bmp);
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
        g.Clear(ColorTranslator.FromHtml("#060d16"));

        // brilho radial de acento
        using (var glow = new GraphicsPath())
        {
            glow.AddEllipse(360, -260, 1200, 900);
            using var pgb = new PathGradientBrush(glow)
            {
                CenterColor = Color.FromArgb(46, 63, 169, 245),
                SurroundColors = new[] { Color.FromArgb(0, 6, 13, 22) },
            };
            g.FillPath(pgb, glow);
        }

        var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center };
        using var white = new SolidBrush(ColorTranslator.FromHtml("#E8F1FB"));
        using var accent = new SolidBrush(ColorTranslator.FromHtml("#5CE1E6"));

        using (var f = new Font("Segoe UI", 96, FontStyle.Bold, GraphicsUnit.Pixel))
            g.DrawString("CONVERGAS", f, white, new RectangleF(0, 430, 1920, 160), sf);
        g.FillRectangle(accent, 860, 592, 200, 4);
        using (var f2 = new Font("Segoe UI", 28, FontStyle.Regular, GraphicsUnit.Pixel))
            g.DrawString("EQUIPAMENTOS E SERVIÇOS", f2, accent, new RectangleF(0, 610, 1920, 50), sf);
        using (var f3 = new Font("Segoe UI", 20, FontStyle.Regular, GraphicsUnit.Pixel))
            g.DrawString("ConvergasControl · Centro de Operações", f3, new SolidBrush(ColorTranslator.FromHtml("#5f7690")), new RectangleF(0, 1000, 1920, 40), sf);

        var enc = ImageCodecInfo.GetImageEncoders().First(c => c.FormatID == ImageFormat.Jpeg.Guid);
        using var p = new EncoderParameters(1);
        p.Param[0] = new EncoderParameter(Encoder.Quality, 92L);
        bmp.Save(path, enc, p);
    }
}
