Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\USER\ardab-market-platform\superadmin\public\logo.jpg"
$outputDir = "C:\Users\USER\ardab-market-platform\mobile\customer\assets\images"

Write-Host "Loading source logo from: $sourcePath"
$src = [System.Drawing.Bitmap]::FromFile($sourcePath)

# 1. Detect tight bounding box of the emblem (ignore outer pure white pixels)
$minX = $src.Width
$minY = $src.Height
$maxX = 0
$maxY = 0

for ($y = 0; $y -lt $src.Height; $y += 2) {
    for ($x = 0; $x -lt $src.Width; $x += 2) {
        $pixel = $src.GetPixel($x, $y)
        # Check if pixel is not pure white (allowing small tolerance for compression artifacts)
        if ($pixel.R -lt 240 -or $pixel.G -lt 240 -or $pixel.B -lt 240) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

# Add small margin
$pad = 10
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($src.Width - $cropX, ($maxX - $minX) + ($pad * 2))
$cropH = [Math]::Min($src.Height - $cropY, ($maxY - $minY) + ($pad * 2))

Write-Host "Detected emblem bounding box: X=$cropX, Y=$cropY, W=$cropW, H=$cropH"

# Crop tight emblem
$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$croppedBmp = $src.Clone($cropRect, $src.PixelFormat)

# Function to create resized icon
function Create-Icon {
    param(
        [string]$outputPath,
        [int]$canvasSize,
        [double]$scaleFactor,
        [bool]$transparentBg,
        [bool]$makeTransparentLogo
    )

    $destBmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($transparentBg) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } else {
        $g.Clear([System.Drawing.Color]::White)
    }

    # Calculate target dimensions preserving aspect ratio
    $maxTarget = $canvasSize * $scaleFactor
    $aspect = $cropW / $cropH
    if ($aspect -gt 1) {
        $targetW = $maxTarget
        $targetH = $maxTarget / $aspect
    } else {
        $targetH = $maxTarget
        $targetW = $maxTarget * $aspect
    }

    $offsetX = ($canvasSize - $targetW) / 2
    $offsetY = ($canvasSize - $targetH) / 2

    $destRect = New-Object System.Drawing.RectangleF($offsetX, $offsetY, $targetW, $targetH)
    $g.DrawImage($croppedBmp, $destRect)
    $g.Dispose()

    # If logo background needs transparency (for adaptive foreground)
    if ($makeTransparentLogo) {
        for ($y = 0; $y -lt $canvasSize; $y++) {
            for ($x = 0; $x -lt $canvasSize; $x++) {
                $p = $destBmp.GetPixel($x, $y)
                if ($p.R -ge 245 -and $p.G -ge 245 -and $p.B -ge 245) {
                    $destBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
                }
            }
        }
    }

    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Generated: $outputPath ($canvasSize x $canvasSize)"
}

# 1. Main Application Icon (1024x1024, clean white background, 72% scale)
Create-Icon "$outputDir\icon.png" 1024 0.72 $false $false

# 2. Android Adaptive Icon Foreground (512x512, transparent background, 64% scale safe zone)
Create-Icon "$outputDir\android-icon-foreground.png" 512 0.64 $true $true

# 3. Android Adaptive Icon Background (512x512, pure white)
$bgBmp = New-Object System.Drawing.Bitmap(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bgG = [System.Drawing.Graphics]::FromImage($bgBmp)
$bgG.Clear([System.Drawing.Color]::White)
$bgG.Dispose()
$bgBmp.Save("$outputDir\android-icon-background.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bgBmp.Dispose()
Write-Host "Generated: $outputDir\android-icon-background.png (512 x 512)"

# 4. Android Adaptive Icon Monochrome (512x512, monochrome silhouette for themed icons)
$monoBmp = New-Object System.Drawing.Bitmap(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$monoG = [System.Drawing.Graphics]::FromImage($monoBmp)
$monoG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$monoG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$monoG.Clear([System.Drawing.Color]::Transparent)

$monoTarget = 512 * 0.64
$monoW = $monoTarget * ($cropW / $cropH)
$monoH = $monoTarget
if ($monoW -gt $monoTarget) {
    $monoW = $monoTarget
    $monoH = $monoTarget / ($cropW / $cropH)
}
$monoX = (512 - $monoW) / 2
$monoY = (512 - $monoH) / 2
$monoRect = New-Object System.Drawing.RectangleF($monoX, $monoY, $monoW, $monoH)
$monoG.DrawImage($croppedBmp, $monoRect)
$monoG.Dispose()

for ($y = 0; $y -lt 512; $y++) {
    for ($x = 0; $x -lt 512; $x++) {
        $p = $monoBmp.GetPixel($x, $y)
        if ($p.R -lt 240 -or $p.G -lt 240 -or $p.B -lt 240) {
            # Make emblem white silhouette
            $monoBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 255, 255, 255))
        } else {
            $monoBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        }
    }
}
$monoBmp.Save("$outputDir\android-icon-monochrome.png", [System.Drawing.Imaging.ImageFormat]::Png)
$monoBmp.Dispose()
Write-Host "Generated: $outputDir\android-icon-monochrome.png (512 x 512)"

# 5. Splash Icon (512x512, transparent background, centered)
Create-Icon "$outputDir\splash-icon.png" 512 0.70 $true $true

# 6. Favicon (64x64, transparent background)
Create-Icon "$outputDir\favicon.png" 64 0.85 $true $true

$croppedBmp.Dispose()
$src.Dispose()
Write-Host "Brand icon generation complete!"
