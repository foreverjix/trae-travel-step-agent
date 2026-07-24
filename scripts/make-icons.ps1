$icons = @(
    @{Name='home.png'; Color='666666'},
    @{Name='home-active.png'; Color='1E90FF'},
    @{Name='ticket.png'; Color='666666'},
    @{Name='ticket-active.png'; Color='1E90FF'},
    @{Name='taxi.png'; Color='666666'},
    @{Name='taxi-active.png'; Color='1E90FF'},
    @{Name='order.png'; Color='666666'},
    @{Name='order-active.png'; Color='1E90FF'},
    @{Name='profile.png'; Color='666666'},
    @{Name='profile-active.png'; Color='1E90FF'}
)

function Create-PNG {
    param(
        [int]$Width,
        [int]$Height,
        [string]$HexColor
    )
    
    $r = [byte]::Parse($HexColor.Substring(0,2), 'HexNumber')
    $g = [byte]::Parse($HexColor.Substring(2,2), 'HexNumber')
    $b = [byte]::Parse($HexColor.Substring(4,2), 'HexNumber')
    
    $signature = [byte[]]@(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
    
    $widthBytes = [BitConverter]::GetBytes([uint32]$Width)
    [Array]::Reverse($widthBytes)
    $heightBytes = [BitConverter]::GetBytes([uint32]$Height)
    [Array]::Reverse($heightBytes)
    
    $ihdrChunk = [byte[]]@(0x49, 0x48, 0x44, 0x52) + $widthBytes + $heightBytes + [byte[]]@(0x08, 0x06, 0x00, 0x00, 0x00)
    $ihdrCrc = [BitConverter]::GetBytes([uint32](Crc32 $ihdrChunk))
    [Array]::Reverse($ihdrCrc)
    $ihdrLen = [BitConverter]::GetBytes([uint32]13)
    [Array]::Reverse($ihdrLen)
    $ihdr = $ihdrLen + $ihdrChunk + $ihdrCrc
    
    $raw = New-Object byte[] (($Width * 4 + 1) * $Height)
    $idx = 0
    for ($y = 0; $y -lt $Height; $y++) {
        $raw[$idx++] = 0
        for ($x = 0; $x -lt $Width; $x++) {
            $raw[$idx++] = $r
            $raw[$idx++] = $g
            $raw[$idx++] = $b
            $raw[$idx++] = 255
        }
    }
    
    $ms = New-Object System.IO.MemoryStream
    $ds = New-Object System.IO.Compression.DeflateStream($ms, [System.IO.Compression.CompressionMode]::Compress)
    $ds.Write($raw, 0, $raw.Length)
    $ds.Close()
    $compressedData = $ms.ToArray()
    $ms.Close()
    
    $idatChunk = [byte[]]@(0x49, 0x44, 0x41, 0x54) + $compressedData
    $idatCrc = [BitConverter]::GetBytes([uint32](Crc32 $idatChunk))
    [Array]::Reverse($idatCrc)
    $idatLen = [BitConverter]::GetBytes([uint32]$compressedData.Length)
    [Array]::Reverse($idatLen)
    $idat = $idatLen + $idatChunk + $idatCrc
    
    $iendChunk = [byte[]]@(0x49, 0x45, 0x4E, 0x44)
    $iendCrc = [BitConverter]::GetBytes([uint32](Crc32 $iendChunk))
    [Array]::Reverse($iendCrc)
    $iend = [byte[]]@(0x00, 0x00, 0x00, 0x00) + $iendChunk + $iendCrc
    
    return $signature + $ihdr + $idat + $iend
}

function Crc32 {
    param([byte[]]$data)
    $crc = 0xFFFFFFFF
    foreach ($byte in $data) {
        $crc = $crc -bxor $byte
        for ($i = 0; $i -lt 8; $i++) {
            $crc = ($crc -shr 1) -bxor (0xEDB88320 * ($crc -band 1))
        }
    }
    return (-$crc) -band 0xFFFFFFFF
}

$dir = 'd:\创作者大赛\Dream\images'
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

foreach ($icon in $icons) {
    $png = Create-PNG 48 48 $icon.Color
    [System.IO.File]::WriteAllBytes((Join-Path $dir $icon.Name), $png)
    Write-Host "Created $($icon.Name)"
}
Write-Host 'All icons created successfully!'