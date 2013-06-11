@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\.\sjs" %*
) ELSE (
  node  "%~dp0\.\sjs" %*
)
