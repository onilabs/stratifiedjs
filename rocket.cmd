@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\.\apollo" "sjs:../rocket-modules/main.sjs" %*
) ELSE (
  node  "%~dp0\.\apollo" "sjs:../rocket-modules/main.sjs" %*
)