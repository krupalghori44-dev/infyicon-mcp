# Read the screen buffer of another console window (by PID) without focusing it.
param([int]$ProcId)
$sig = @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class CR {
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool FreeConsole();
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool AttachConsole(int pid);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr CreateFile(string n, uint a, uint s, IntPtr sa, uint c, uint f, IntPtr t);
  [StructLayout(LayoutKind.Sequential)] public struct COORD { public short X; public short Y; }
  [StructLayout(LayoutKind.Sequential)] public struct SMALL_RECT { public short L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct CSBI { public COORD size; public COORD pos; public short attr; public SMALL_RECT win; public COORD max; }
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool GetConsoleScreenBufferInfo(IntPtr h, out CSBI i);
  [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern bool ReadConsoleOutputCharacterW(IntPtr h, StringBuilder b, uint n, COORD c, out uint r);
  public static string Dump(int pid) {
    FreeConsole();
    if (!AttachConsole(pid)) return "ATTACH_FAIL " + Marshal.GetLastWin32Error();
    IntPtr h = CreateFile("CONOUT$", 0x80000000|0x40000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
    CSBI i; if (!GetConsoleScreenBufferInfo(h, out i)) return "CSBI_FAIL " + Marshal.GetLastWin32Error();
    var sb = new StringBuilder(); short last = (short)(i.pos.Y + 1); short first = (short)Math.Max(0, last - 60);
    for (short y = first; y < last; y++) { var b = new StringBuilder(i.size.X); uint r; COORD c; c.X = 0; c.Y = y;
      ReadConsoleOutputCharacterW(h, b, (uint)i.size.X, c, out r); string line = b.ToString().TrimEnd(); if (line.Length > 0) sb.AppendLine(line); }
    FreeConsole(); return sb.ToString();
  }
}
'@
Add-Type -TypeDefinition $sig
[CR]::Dump($ProcId)
