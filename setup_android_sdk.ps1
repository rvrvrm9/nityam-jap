$sdkDir = "C:\Android\Sdk"
$cmdlineDir = "$sdkDir\cmdline-tools\latest"
$zipPath = "C:\Android\cmdline-tools.zip"

New-Item -ItemType Directory -Force -Path "C:\Android" | Out-Null
New-Item -ItemType Directory -Force -Path $sdkDir | Out-Null

if (-not (Test-Path "$cmdlineDir\bin\sdkmanager.bat")) {
    Write-Host "Downloading Android Commandline Tools via curl..."
    curl.exe -L -o $zipPath "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    
    Write-Host "Extracting Commandline Tools..."
    Expand-Archive -Path $zipPath -DestinationPath "C:\Android\temp_tools" -Force
    
    New-Item -ItemType Directory -Force -Path $cmdlineDir | Out-Null
    Copy-Item -Path "C:\Android\temp_tools\cmdline-tools\*" -Destination $cmdlineDir -Recurse -Force
    Remove-Item "C:\Android\temp_tools" -Recurse -Force
    Remove-Item $zipPath -Force
}

$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot"
$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:PATH = "$cmdlineDir\bin;$env:JAVA_HOME\bin;$env:PATH"

# Write local.properties for Gradle
$localProp = "sdk.dir=C:\\Android\\Sdk"
Set-Content -Path "E:\jaap-mala-mobile\android\local.properties" -Value $localProp

Write-Host "Accepting licenses and installing Android build tools 35..."
$sdkmanager = "$cmdlineDir\bin\sdkmanager.bat"
$yes = "y`ny`ny`ny`ny`ny`ny`n"
$yes | & $sdkmanager --sdk_root=$sdkDir "platform-tools" "platforms;android-35" "build-tools;35.0.0"

Write-Host "Android SDK configured successfully at $sdkDir"
