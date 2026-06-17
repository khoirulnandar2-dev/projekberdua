@echo off
:: Cek apakah Chrome terinstal di lokasi standar
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "%~dp0index.html"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" "%~dp0index.html"
) else (
    :: Jika tidak ditemukan di path default, coba panggil langsung dari path sistem
    start chrome "%~dp0index.html"
)
exit
