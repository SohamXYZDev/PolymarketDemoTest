@echo off

echo 🚀 Polymarket Demo Test - Setup Script
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18.0.0 or later
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ %NODE_VERSION% detected
echo.

REM Check if npm is installed
where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ npm is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% detected
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo ✅ Dependencies installed
echo.

REM Check if .env exists
if not exist .env (
    echo ⚠️  .env file not found
    echo 📋 Copying .env.example to .env
    copy .env.example .env
    echo ✅ .env created
    echo.
    echo 📝 Please edit .env with your credentials:
    echo    PRIVATE_KEY=0x...  ^(your Ethereum private key^)
    echo    WALLET_ADDRESS=0x... ^(your wallet address^)
    echo.
) else (
    echo ✅ .env file exists
)

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo   1. Edit .env with your Polymarket credentials
echo   2. Run 'npm run dev' for development
echo   3. Or 'npm run build && npm start' for production
echo.

pause
