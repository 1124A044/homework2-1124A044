document.addEventListener('DOMContentLoaded', function() {
    // 建立除錯訊息顯示區
    const debugConsole = document.createElement('div');
    debugConsole.style.position = 'absolute';
    debugConsole.style.bottom = '10px';
    debugConsole.style.left = '10px';
    debugConsole.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    debugConsole.style.color = '#fff';
    debugConsole.style.padding = '10px';
    debugConsole.style.borderRadius = '5px';
    debugConsole.style.maxWidth = '300px';
    debugConsole.style.maxHeight = '150px';
    debugConsole.style.overflowY = 'auto';
    debugConsole.style.zIndex = '1000';
    debugConsole.style.fontSize = '12px';
    debugConsole.style.fontFamily = 'monospace';
    document.body.appendChild(debugConsole);

    // 自訂 log 函數
    function log(message) {
        console.log(message);
        const logEntry = document.createElement('div');
        logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
        debugConsole.appendChild(logEntry);
        debugConsole.scrollTop = debugConsole.scrollHeight;
        // 只保留最新的 10 條訊息
        while (debugConsole.children.length > 10) {
            debugConsole.removeChild(debugConsole.firstChild);
        }
    }

    // 初始化訊息
    log('頁面已載入，等待連接...');
    
    // 建立 canvas 元素並插入 body
    let canvas = document.getElementById('waveCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'waveCanvas';
        document.body.appendChild(canvas);
    }
    
    // 創建序列埠連接按鈕
    const connectBtn = document.createElement('button');
    connectBtn.textContent = '連接電阻控制器';
    connectBtn.style.position = 'absolute';
    connectBtn.style.top = '10px';
    connectBtn.style.right = '10px';
    connectBtn.style.zIndex = '1000';
    connectBtn.style.padding = '8px 16px';
    connectBtn.style.backgroundColor = '#333';
    connectBtn.style.color = '#fff';
    connectBtn.style.border = 'none';
    connectBtn.style.borderRadius = '4px';
    connectBtn.style.cursor = 'pointer';
    document.body.appendChild(connectBtn);

    const ctx = canvas.getContext('2d');
    
    // 序列埠相關變數
    let port;
    let reader;
    let readableStreamClosed;
    let potentiometerValue = 50; // 預設值 (0-100)
    
    // 設定三條線的參數
    const lines = [
        {
            color: 'rgba(255, 89, 94, 0.8)', // 紅色調，透明度增加
            verticalCenter: window.innerHeight * 0.3, // 第一條線在畫面上方
            baseAmplitude: 120 + Math.random() * 50, // 增大振幅
            lineWidth: 3, // 增加線寬
            // 波形參數
            frequency: 0.0025 + Math.random() * 0.0018, // 增加頻率
            phase: Math.random() * Math.PI * 2,
            speed: 0.025 + Math.random() * 0.015, // 增加速度
            horizontalSpeed: 1.8 + Math.random() * 0.5, // 增加水平移動速度
            floatSpeed: 0.0015 + Math.random() * 0.0005, // 增加飄浮速度
            floatAmplitude: 40 + Math.random() * 25, // 增加飄浮幅度
            previousWavePoints: [],
            subWaves: []
        },
        {
            color: 'rgba(76, 201, 240, 0.8)', // 藍色調，透明度增加
            verticalCenter: window.innerHeight * 0.5, // 第二條線在畫面中間
            baseAmplitude: 150 + Math.random() * 60, // 增大振幅
            lineWidth: 3.5, // 增加線寬
            // 波形參數
            frequency: 0.002 + Math.random() * 0.0015, // 增加頻率
            phase: Math.random() * Math.PI * 2,
            speed: 0.02 + Math.random() * 0.015, // 增加速度
            horizontalSpeed: 1.3 + Math.random() * 0.4, // 增加水平移動速度
            floatSpeed: 0.0012 + Math.random() * 0.0005, // 增加飄浮速度
            floatAmplitude: 50 + Math.random() * 30, // 增加飄浮幅度
            previousWavePoints: [],
            subWaves: []
        },
        {
            color: 'rgba(189, 178, 255, 0.8)', // 紫色調，透明度增加
            verticalCenter: window.innerHeight * 0.7, // 第三條線在畫面下方
            baseAmplitude: 100 + Math.random() * 45, // 增大振幅
            lineWidth: 2.8, // 增加線寬
            // 波形參數
            frequency: 0.0028 + Math.random() * 0.002, // 增加頻率
            phase: Math.random() * Math.PI * 2,
            speed: 0.028 + Math.random() * 0.018, // 增加速度
            horizontalSpeed: 2.0 + Math.random() * 0.6, // 增加水平移動速度
            floatSpeed: 0.0018 + Math.random() * 0.0006, // 增加飄浮速度
            floatAmplitude: 45 + Math.random() * 25, // 增加飄浮幅度
            previousWavePoints: [],
            subWaves: []
        }
    ];
    
    // 為每條線創建子波，使波形更加自然
    lines.forEach(line => {
        line.subWaves = [
            { 
                frequency: line.frequency * (0.4 + Math.random() * 0.2),
                amplitude: line.baseAmplitude * 0.2,
                speed: line.speed * 0.7,
                phase: Math.random() * Math.PI * 2
            },
            { 
                frequency: line.frequency * (0.8 + Math.random() * 0.3),
                amplitude: line.baseAmplitude * 0.1,
                speed: line.speed * 1.3,
                phase: Math.random() * Math.PI * 2
            },
            { 
                frequency: line.frequency * (1.5 + Math.random() * 0.4),
                amplitude: line.baseAmplitude * 0.05,
                speed: line.speed * 1.7,
                phase: Math.random() * Math.PI * 2
            }
        ];
        
        // 儲存原始振幅，用於電阻控制
        line.originalBaseAmplitude = line.baseAmplitude;
        
        // 為每條線設置不同的初始偏移量
        line.horizontalOffset = Math.random() * 1000;
    });
    
    // 時間變數
    let time = Math.random() * 100; // 隨機的起始時間
    
    // 延伸參數 - 讓線條延伸到畫面外
    const extensionFactor = 0.3; // 每側延伸畫面寬度的30%

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // 更新每條線的垂直位置
        lines[0].verticalCenter = window.innerHeight * 0.3;
        lines[1].verticalCenter = window.innerHeight * 0.5;
        lines[2].verticalCenter = window.innerHeight * 0.7;
        
        // 重設前一幀波形
        const totalWidth = Math.ceil(canvas.width * (1 + extensionFactor * 2));
        lines.forEach(line => {
            line.previousWavePoints = Array(totalWidth).fill(line.verticalCenter);
        });
    }

    // 使用平滑曲線繪製波浪
    function drawSmoothWave(points, color, lineWidth) {
        if (points.length < 2) return;
        
        const startX = -canvas.width * extensionFactor;
        
        ctx.beginPath();
        ctx.moveTo(startX, points[0]);
        
        // 使用平滑的曲線連接點
        for (let i = 1; i < points.length; i++) {
            const x = startX + i;
            ctx.lineTo(x, points[i]);
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
    
    // 自然平滑波形函數 - 加入水平偏移
    function generateWavePoint(x, time, line) {
        // 添加水平偏移，實現右至左移動
        const adjustedX = x + line.horizontalOffset;
        
        // 主波
        let value = Math.sin(adjustedX * line.frequency + time * line.speed + line.phase) * line.baseAmplitude;
        
        // 添加子波，創造更自然的波形
        for (const wave of line.subWaves) {
            value += Math.sin(adjustedX * wave.frequency + time * wave.speed + wave.phase) * wave.amplitude;
        }
        
        return value;
    }

    function drawWave() {
        // 增加時間
        time += 0.013; // 保持原始速度
        
        // 根據可調式電阻值調整波浪高度 - 大幅增加控制範圍
        lines.forEach(line => {
            // 利用電阻值 (0-100) 調整振幅，範圍從 5% 到 500% (大幅增加最大值)
            const amplitudeFactor = 0.05 + (potentiometerValue / 100) * 4.95;
            line.baseAmplitude = line.originalBaseAmplitude * amplitudeFactor;
            
            // 同時調整子波振幅
            line.subWaves.forEach((wave, index) => {
                const basePercent = index === 0 ? 0.2 : (index === 1 ? 0.1 : 0.05);
                wave.amplitude = line.baseAmplitude * basePercent;
            });
        });
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 繪製每條線
        lines.forEach(line => {
            // 增加水平偏移量，實現從右到左的移動
            line.horizontalOffset += line.horizontalSpeed;
            
            // 計算垂直位置的緩慢自然變化，增加非線性變化
            const verticalShift = Math.sin(time * line.floatSpeed) * line.floatAmplitude + 
                                 Math.cos(time * line.floatSpeed * 1.5) * (line.floatAmplitude * 0.4);
    
            // 創建當前幀的波形點 - 計算範圍擴展到畫面外
            const totalWidth = Math.ceil(canvas.width * (1 + extensionFactor * 2));
            const currentWavePoints = [];
            
            for (let i = 0; i < totalWidth; i++) {
                // 計算實際x坐標（相對於延伸後的起點）
                const x = i;
                
                // 生成波形值，加入水平偏移
                const waveValue = generateWavePoint(x, time, line);
                
                // 計算當前點的 y 坐標
                let y = line.verticalCenter + waveValue + verticalShift;
                
                // 與前一幀進行平滑過渡
                if (line.previousWavePoints[i]) {
                    // 將當前幀的值與前一幀的值混合
                    y = line.previousWavePoints[i] * 0.85 + y * 0.15;
                }
                
                currentWavePoints[i] = y;
            }
    
            // 繪製波浪
            drawSmoothWave(currentWavePoints, line.color, line.lineWidth);
            
            // 保存當前波形作為下一幀的前一幀
            line.previousWavePoints = [...currentWavePoints];
        });
        
        // 使用 requestAnimationFrame 以獲得更流暢的動畫
        requestAnimationFrame(drawWave);
    }

    // 序列埠連接功能
    async function connectToSerialPort() {
        try {
            log('請求序列埠存取權...');
            // 請求一個序列埠
            port = await navigator.serial.requestPort();
            log('已選擇序列埠，嘗試開啟...');
            
            // 打開序列埠
            await port.open({ baudRate: 9600 });
            log('序列埠已開啟！等待 Arduino 資料...');
            connectBtn.textContent = '已連接';
            connectBtn.style.backgroundColor = '#4CAF50';
            connectBtn.disabled = true;
            
            // 開始讀取數據
            startSerialReading();
        } catch (error) {
            const errorMsg = `連接錯誤: ${error.message || error}`;
            log(errorMsg);
            alert('無法連接到序列埠。請確保 Arduino 已連接並已上傳正確的程式碼。');
        }
    }
    
    // 開始從序列埠讀取數據
    async function startSerialReading() {
        try {
            // 設置讀取器
            const textDecoder = new TextDecoder();
            reader = port.readable.getReader();
            
            log('開始讀取序列資料');
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    log('序列埠讀取已完成');
                    reader.releaseLock();
                    break;
                }
                
                // 解析資料
                const text = textDecoder.decode(value);
                processSerialData(text);
            }
        } catch (error) {
            log(`讀取資料錯誤: ${error.message || error}`);
        }
    }
    
    // 處理接收到的序列數據
    function processSerialData(data) {
        log(`收到資料: ${data.trim()}`);
        
        // 檢查是否含有電位計數據
        if (data.includes('POT:')) {
            // 提取電位計數值
            const matches = data.match(/POT:(\d+)/);
            if (matches && matches.length > 1) {
                const value = parseInt(matches[1]);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                    potentiometerValue = value;
                    log(`電位計數值已更新: ${potentiometerValue}`);
                }
            }
        } else if (data.includes('READY:POTENTIOMETER')) {
            log('Arduino 裝置就緒');
        }
    }
    
    // 檢查 Web Serial API 是否可用
    if ('serial' in navigator) {
        log('瀏覽器支援 Web Serial API');
        connectBtn.addEventListener('click', connectToSerialPort);
    } else {
        const errorMsg = '此瀏覽器不支援 Web Serial API';
        log(errorMsg);
        connectBtn.textContent = '瀏覽器不支援';
        connectBtn.disabled = true;
        connectBtn.style.backgroundColor = '#ccc';
    }

    window.addEventListener('resize', function() {
        resizeCanvas();
    });
    
    log('初始化畫面...');
    resizeCanvas();
    log('開始動畫循環');
    // 開始動畫循環
    requestAnimationFrame(drawWave);
});