@echo off
chcp 65001 >nul
setlocal
title Jaturamitr ROV - ติดตั้งระบบสตรีม
cd /d "%~dp0"

REM  หมายเหตุสำหรับคนแก้ไฟล์นี้ต่อ:
REM  ใช้ goto แทนบล็อก if ( ... ) else ( ... ) โดยตั้งใจ
REM  เพราะ cmd อ่านทั้งบล็อกทีเดียวก่อนรัน วงเล็บที่หลุดมาในข้อความจะปิดบล็อกก่อนเวลา
REM  แล้วโค้ดสองฝั่งจะรันพร้อมกัน ซึ่งเคยทำให้เขียนทับไฟล์ .env มาแล้ว

set "FAILED="

echo.
echo ==========================================================
echo   Jaturamitr ROV - ติดตั้งระบบสตรีมการแข่งขัน
echo ==========================================================
echo.

REM ---------------------------------------------------------------
REM  1. ตรวจว่ารันจากในโฟลเดอร์โปรเจกต์จริง
REM ---------------------------------------------------------------
if exist "package.json" goto :step2
echo [ผิดพลาด] ไม่พบไฟล์ package.json
echo วางไฟล์ setup.bat ไว้ในโฟลเดอร์เดียวกับ package.json แล้วรันใหม่
set "FAILED=1"
goto :theend

:step2
echo [1/6] โฟลเดอร์โปรเจกต์: %CD%
echo.
echo [2/6] ตรวจ Node.js
where node >nul 2>&1
if not errorlevel 1 goto :nodecheck

echo       ยังไม่มี Node.js - กำลังลองติดตั้งด้วย winget
where winget >nul 2>&1
if not errorlevel 1 goto :nodeinstall
echo       [ผิดพลาด] เครื่องนี้ไม่มี winget
echo       ติดตั้ง Node.js LTS เองจาก https://nodejs.org แล้วรัน setup.bat ใหม่
set "FAILED=1"
goto :theend

:nodeinstall
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
where node >nul 2>&1
if not errorlevel 1 goto :nodecheck
echo.
echo       ติดตั้ง Node.js แล้ว แต่ต้องเปิดหน้าต่างใหม่ระบบถึงจะรู้จัก
echo       ปิดหน้าต่างนี้แล้วดับเบิลคลิก setup.bat อีกครั้ง
set "FAILED=1"
goto :theend

:nodecheck
for /f %%v in ('node -v') do set "NODEVER=%%v"
for /f "tokens=1 delims=." %%a in ("%NODEVER%") do set "NODEMAJOR=%%a"
set "NODEMAJOR=%NODEMAJOR:v=%"
if %NODEMAJOR% GEQ 20 goto :nodeok
echo       [ผิดพลาด] พบ Node %NODEVER% แต่ระบบต้องการ v20.12 ขึ้นไป
echo       อัปเดตจาก https://nodejs.org แล้วรันใหม่
set "FAILED=1"
goto :theend

:nodeok
echo       พบ Node %NODEVER%
echo.

REM ---------------------------------------------------------------
REM  3. ติดตั้ง dependencies
REM ---------------------------------------------------------------
echo [3/6] ติดตั้งไลบรารี ^(npm install^) - อาจใช้เวลาสักครู่
echo.
call npm install --no-fund --no-audit
if not errorlevel 1 goto :npmok
echo.
echo       [ผิดพลาด] npm install ไม่สำเร็จ - ตรวจการเชื่อมต่ออินเทอร์เน็ต
set "FAILED=1"
goto :theend

:npmok
echo.
echo       ติดตั้งไลบรารีเรียบร้อย
echo.

REM ---------------------------------------------------------------
REM  4. ไฟล์ตั้งค่า .env
REM     ห้ามแตะไฟล์เดิมเด็ดขาด เพราะมีรหัสผ่านที่ผู้ใช้ตั้งไว้
REM ---------------------------------------------------------------
echo [4/6] ไฟล์ตั้งค่า .env
if not exist ".env" goto :envcreate
echo       มี .env อยู่แล้ว - ไม่แตะต้อง
goto :envdone

:envcreate
echo.
echo       ใส่รหัสผ่าน obs-websocket จาก OBS
echo       เมนู Tools ^> WebSocket Server Settings ^> Show Connect Info
echo       ถ้ายังไม่ได้ตั้ง กด Enter ข้ามไปก่อน แล้วแก้ในไฟล์ .env ทีหลังได้
echo.
set "OBSPASS="
set /p "OBSPASS=      รหัสผ่าน obs-websocket: "
REM อ่านรหัสผ่านจาก environment variable ไม่ใช่ command line
REM เพราะรหัสผ่านที่มี " & ^ | จะทำให้ cmd แยกคำสั่งผิด แล้วค่าที่ได้จะเพี้ยน
node scripts\write-env.mjs
if errorlevel 1 goto :envfail
goto :envdone

:envfail
echo       [ผิดพลาด] สร้าง .env ไม่สำเร็จ - คัดลอก .env.example เป็น .env เองแล้วแก้รหัสผ่าน
set "FAILED=1"

:envdone
echo.

REM ---------------------------------------------------------------
REM  5. รูปฮีโร่
REM ---------------------------------------------------------------
echo [5/6] รูปฮีโร่
set "HEROCOUNT=0"
if not exist "public\heroes" goto :herocheck
for /f %%c in ('dir /b /a-d "public\heroes" 2^>nul ^| find /c /v ""') do set "HEROCOUNT=%%c"

:herocheck
if %HEROCOUNT% EQU 0 goto :heroask
echo       มีรูปอยู่แล้ว %HEROCOUNT% ไฟล์ - ข้ามไป
goto :herodone

:heroask
echo       ยังไม่มีรูปฮีโร่ ^(ระบบใช้งานได้อยู่ แต่จะขึ้นเป็นตัวย่อแทนรูป^)
set "GETHEROES="
set /p "GETHEROES=      ดาวน์โหลดจาก API ทางการเลยไหม (Y/n): "
if /i "%GETHEROES%"=="n" goto :heroskip
echo.
call npm run heroes:fetch
echo.
goto :herodone

:heroskip
echo       ข้ามไป - สั่ง "npm run heroes:fetch" เองภายหลังได้

:herodone
echo.

REM ---------------------------------------------------------------
REM  6. ตรวจ OBS Studio
REM ---------------------------------------------------------------
echo [6/6] ตรวจ OBS Studio
set "OBSFOUND="
if exist "%ProgramFiles%\obs-studio\bin\64bit\obs64.exe" set "OBSFOUND=1"
if exist "%ProgramFiles(x86)%\obs-studio\bin\64bit\obs64.exe" set "OBSFOUND=1"
if not defined OBSFOUND goto :obsmissing
echo       พบ OBS Studio แล้ว
goto :obsdone

:obsmissing
echo       ยังไม่พบ OBS Studio ในเครื่องนี้
echo       ติดตั้งเวอร์ชัน 30.2 ขึ้นไปจาก https://obsproject.com
echo       ต้องใช้ 30.2+ เพื่อให้บันทึกเป็น hybrid MP4 ที่กู้ไฟล์ได้เมื่อโปรแกรมดับ

:obsdone
echo.

REM ---------------------------------------------------------------
REM  เสร็จ
REM ---------------------------------------------------------------
echo ==========================================================
echo   ติดตั้งเสร็จแล้ว
echo ==========================================================
echo.
echo   ขั้นตอนต่อไป
echo.
echo     1. เปิด OBS แล้วเปิด Tools ^> WebSocket Server Settings
echo     2. นำเข้าฉาก: Scene Collection ^> Import ^> obs\JaturamitrRoV.json
echo     3. เลือกอุปกรณ์ให้ CAM - Capture Card และ CAM - Casters
echo     4. สั่ง npm run dev แล้วเปิด http://localhost:3000/control
echo.
echo   เอกสาร
echo     docs\obs-setup.md      ตั้งค่า OBS ครบทุกหัวข้อ
echo     docs\runbook.md        checklist วันแข่ง
echo     docs\graphics-spec.md  ขนาดไฟล์กราฟิกทุกชิ้น
echo.
set "RUNNOW="
set /p "RUNNOW=  เริ่มระบบเลยไหม (Y/n): "
if /i "%RUNNOW%"=="n" goto :theend
echo.
call npm run dev

:theend
echo.
if defined FAILED echo   ติดตั้งไม่สำเร็จ - แก้ตามข้อความด้านบนแล้วรันใหม่
pause
endlocal
