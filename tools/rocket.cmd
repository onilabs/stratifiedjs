@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\.\sjs" "sjs:../rocket-modules/main.sjs" %*
) ELSE (
  node  "%~dp0\.\sjs" "sjs:../rocket-modules/main.sjs" %*
)
