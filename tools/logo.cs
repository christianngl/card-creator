// Erzeugt aus den Original-Logos (assets/logo/*-original.png) die Fassungen für die App und das Icon assets/app.ico (16–256 px).
// Bauen und ausführen (PowerShell, im Repo):
//   & "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize /r:System.Drawing.dll /out:$env:TEMP\ctcg-logo.exe tools\logo.cs
//   & $env:TEMP\ctcg-logo.exe assets
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

class Logo
{
    static void Main(string[] a)
    {
        string assets = a[0], ordner = Path.Combine(assets, "logo");
        var logo = Zuschneiden(new Bitmap(Path.Combine(ordner, "ctcg-logo-original.png")));
        var text = Zuschneiden(new Bitmap(Path.Combine(ordner, "ctcg-logo-text-original.png")));
        Console.WriteLine("Logo {0}x{1}, mit Text {2}x{3}", logo.Width, logo.Height, text.Width, text.Height);

        // Startseite (Logo mit Schriftzug) sowie Kopfzeile und Über-Dialog (Logo allein), jeweils in doppelter Auflösung
        Skaliert(text, 0, 260).Save(Path.Combine(ordner, "ctcg-logo-text.png"), ImageFormat.Png);
        Skaliert(logo, 0, 320).Save(Path.Combine(ordner, "ctcg-logo.png"), ImageFormat.Png);

        // Icon: quadratisch, ab 32 px mit wenig Rand
        var groessen = new[] { 16, 24, 32, 48, 64, 128, 256 };
        var bilder = new List<byte[]>();
        foreach (int g in groessen)
        {
            using (var ms = new MemoryStream())
            {
                Quadrat(logo, g).Save(ms, ImageFormat.Png);
                bilder.Add(ms.ToArray());
            }
        }
        Quadrat(logo, 256).Save(Path.Combine(ordner, "ctcg-icon.png"), ImageFormat.Png);
        using (var f = new BinaryWriter(File.Create(Path.Combine(assets, "app.ico"))))
        {
            f.Write((short)0); f.Write((short)1); f.Write((short)groessen.Length);
            int offset = 6 + 16 * groessen.Length;
            for (int i = 0; i < groessen.Length; i++)
            {
                f.Write((byte)(groessen[i] >= 256 ? 0 : groessen[i])); f.Write((byte)(groessen[i] >= 256 ? 0 : groessen[i]));
                f.Write((byte)0); f.Write((byte)0); f.Write((short)1); f.Write((short)32);
                f.Write(bilder[i].Length); f.Write(offset);
                offset += bilder[i].Length;
            }
            foreach (var b in bilder) f.Write(b);
        }
    }

    // Schneidet den transparenten Rand ab
    static Bitmap Zuschneiden(Bitmap src)
    {
        int minX = src.Width, minY = src.Height, maxX = -1, maxY = -1;
        var d = src.LockBits(new Rectangle(0, 0, src.Width, src.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        var px = new byte[src.Width * src.Height * 4];
        System.Runtime.InteropServices.Marshal.Copy(d.Scan0, px, 0, px.Length);
        src.UnlockBits(d);
        for (int y = 0; y < src.Height; y++)
            for (int x = 0; x < src.Width; x++)
                if (px[(y * src.Width + x) * 4 + 3] > 16)
                {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
        if (maxX < 0) throw new Exception("Bild hat keine deckenden Pixel");
        return src.Clone(new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1), PixelFormat.Format32bppArgb);
    }

    static Bitmap Skaliert(Bitmap src, int breite, int hoehe)
    {
        if (breite == 0) breite = (int)Math.Round(src.Width * (double)hoehe / src.Height);
        var b = new Bitmap(breite, hoehe, PixelFormat.Format32bppArgb);
        using (var g = Grafik(b)) g.DrawImage(src, 0, 0, breite, hoehe);
        return b;
    }

    static Bitmap Quadrat(Bitmap src, int groesse)
    {
        double rand = groesse <= 24 ? 0 : groesse * 0.03;
        double s = (groesse - 2 * rand) / Math.Max(src.Width, src.Height);
        float w = (float)(src.Width * s), h = (float)(src.Height * s);
        var b = new Bitmap(groesse, groesse, PixelFormat.Format32bppArgb);
        using (var g = Grafik(b)) g.DrawImage(src, (groesse - w) / 2, (groesse - h) / 2, w, h);
        return b;
    }

    static Graphics Grafik(Bitmap b)
    {
        var g = Graphics.FromImage(b);
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.SmoothingMode = SmoothingMode.HighQuality;
        g.CompositingQuality = CompositingQuality.HighQuality;
        return g;
    }
}
