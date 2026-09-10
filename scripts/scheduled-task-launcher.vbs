' Keep scheduled maintenance completely windowless, including child processes.
Option Explicit
If WScript.Arguments.Count < 1 Then WScript.Quit 2
Dim shell, command, i
Set shell = CreateObject("WScript.Shell")
command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Quote(WScript.Arguments(0))
For i = 1 To WScript.Arguments.Count - 1
  command = command & " " & Quote(WScript.Arguments(i))
Next
WScript.Quit shell.Run(command, 0, True)
Function Quote(value)
  Quote = Chr(34) & Replace(CStr(value), Chr(34), Chr(34) & Chr(34)) & Chr(34)
End Function
