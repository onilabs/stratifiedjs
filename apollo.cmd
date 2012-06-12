@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\.\apollo" %*
) ELSE (
  node  "%~dp0\.\apollo" %*
)