/*
 * 波浪高度控制 - 使用可調式電阻
 * 將可調式電阻連接到 Arduino 的 A0 針腳
 * 通過序列埠將數據傳送到電腦
 * 超強穩定濾波版本
 */

const int potPin = A0;    // 可調式電阻連接的針腳
int potValue = 0;         // 用來儲存電阻值的變數
int lastSentValue = -1;   // 上次傳送的值
int filteredValue = 0;    // 濾波後的值
unsigned long lastSendTime = 0; // 上次傳送的時間
const int sendInterval = 200;   // 傳送數據的間隔 (毫秒)，大幅增加間隔
const int threshold = 1;        // 值變化閾值，超低敏感度

// 超強滑動平均濾波
const int numReadings = 20;     // 增加樣本數量
int readings[numReadings];      // 儲存讀取值的陣列
int readIndex = 0;              // 當前讀取的索引
long total = 0;                 // 讀取值的總和，使用long避免溢出
int average = 0;                // 平均值

// 平滑過濾參數
float smoothingFactor = 0.95;   // 加強平滑係數
int smoothedValue = 0;          // 平滑過濾後的值

// 中值濾波器參數
const int medianFilterSize = 7;
int medianValues[medianFilterSize];
int medianSorted[medianFilterSize];

// 存儲排序後的最終輸出值
int finalOutputValues[5] = {0, 0, 0, 0, 0};
int outputIndex = 0;

void setup() {
  // 使用內部上拉電阻，可以減少外部干擾
  pinMode(potPin, INPUT_PULLUP);
  
  Serial.begin(9600);     // 初始化序列通訊，設定速率為 9600 bps
  
  // 初始化讀取值陣列
  for (int i = 0; i < numReadings; i++) {
    readings[i] = 0;
  }
  
  // 初始化中值濾波器陣列
  for (int i = 0; i < medianFilterSize; i++) {
    medianValues[i] = 0;
    medianSorted[i] = 0;
  }
  
  // 暖機讀取，讓類比輸入穩定
  for (int i = 0; i < 50; i++) {
    analogRead(potPin);
    delay(10);
  }
  
  // 初始化所有過濾值
  int initialValue = 0;
  for (int i = 0; i < 10; i++) {
    initialValue += analogRead(potPin);
    delay(10);
  }
  initialValue = initialValue / 10;
  
  // 設置初始值
  smoothedValue = initialValue;
  filteredValue = initialValue;
  
  // 填充所有緩衝區
  for (int i = 0; i < numReadings; i++) {
    readings[i] = initialValue;
    total += initialValue;
  }
  
  for (int i = 0; i < medianFilterSize; i++) {
    medianValues[i] = initialValue;
  }
  
  for (int i = 0; i < 5; i++) {
    finalOutputValues[i] = initialValue;
  }
  
  delay(1000);            // 等待序列埠初始化
  Serial.println("READY:POTENTIOMETER"); // 傳送就緒訊號
}

// 插入排序函數，用於中值濾波
void insertionSort(int arr[], int size) {
  for (int i = 1; i < size; i++) {
    int key = arr[i];
    int j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
}

// 中值濾波函數
int medianFilter(int newValue) {
  // 將新值移入緩衝區
  for (int i = 0; i < medianFilterSize - 1; i++) {
    medianValues[i] = medianValues[i + 1];
  }
  medianValues[medianFilterSize - 1] = newValue;
  
  // 複製到排序用陣列
  for (int i = 0; i < medianFilterSize; i++) {
    medianSorted[i] = medianValues[i];
  }
  
  // 排序
  insertionSort(medianSorted, medianFilterSize);
  
  // 返回中值
  return medianSorted[medianFilterSize / 2];
}

// 最終輸出平滑函數
int finalSmoothing(int newValue) {
  // 移動輸出值
  for (int i = 0; i < 4; i++) {
    finalOutputValues[i] = finalOutputValues[i + 1];
  }
  finalOutputValues[4] = newValue;
  
  // 計算平均值
  int sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += finalOutputValues[i];
  }
  return sum / 5;
}

void loop() {
  // 獲取多個樣本
  long samplesSum = 0;
  for (int i = 0; i < 8; i++) {  // 取8個樣本
    samplesSum += analogRead(potPin);
    delay(2);
  }
  potValue = samplesSum / 8;  // 平均值
  
  // 中值濾波 - 去除極端雜訊
  int medianValue = medianFilter(potValue);
  
  // 滑動平均濾波
  total = total - readings[readIndex];
  readings[readIndex] = medianValue;
  total = total + readings[readIndex];
  readIndex = (readIndex + 1) % numReadings;
  average = total / numReadings;
  
  // 指數平滑濾波 - 結合新讀取的值和之前的平滑值
  smoothedValue = smoothingFactor * smoothedValue + (1 - smoothingFactor) * average;
  
  // 最終平滑處理
  filteredValue = finalSmoothing(smoothedValue);
  
  // 只有當值明顯變化或經過一段時間才傳送，減少不必要的通訊
  unsigned long currentTime = millis();
  int valuePercent = map(filteredValue, 0, 1023, 0, 100);
  
  if ((abs(filteredValue - lastSentValue) > threshold && currentTime - lastSendTime > 50) || 
      currentTime - lastSendTime > sendInterval) {
    // 傳送數據
    Serial.print("POT:");
    Serial.println(valuePercent);
    
    // 更新上次傳送的值和時間
    lastSentValue = filteredValue;
    lastSendTime = currentTime;
  }
  
  // 適當延遲
  delay(5);
}