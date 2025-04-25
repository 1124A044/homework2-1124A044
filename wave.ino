/*
 * 波浪高度控制 - 使用可調式電阻
 * 將可調式電阻連接到 Arduino 的 A0 針腳
 * 通過序列埠將數據傳送到電腦
 */

const int potPin = A0;    // 可調式電阻連接的針腳
int potValue = 0;         // 用來儲存電阻值的變數
int lastSentValue = 0;    // 上次傳送的值
unsigned long lastSendTime = 0; // 上次傳送的時間
const int sendInterval = 50;    // 傳送數據的間隔 (毫秒)
const int threshold = 5;        // 值變化閾值，小變化不傳送

void setup() {
  Serial.begin(9600);     // 初始化序列通訊，設定速率為 9600 bps
  delay(1000);            // 等待序列埠初始化
  Serial.println("READY:POTENTIOMETER"); // 傳送就緒訊號
}

void loop() {
  // 讀取可調式電阻的值 (0-1023)
  potValue = analogRead(potPin);
  
  // 只有當值明顯變化或經過一段時間才傳送，減少不必要的通訊
  unsigned long currentTime = millis();
  if (abs(potValue - lastSentValue) > threshold || currentTime - lastSendTime > sendInterval) {
    // 將電阻值轉換為百分比 (0-100)
    int valuePercent = map(potValue, 0, 1023, 0, 100);
    
    // 傳送數據
    Serial.print("POT:");
    Serial.println(valuePercent);
    
    // 更新上次傳送的值和時間
    lastSentValue = potValue;
    lastSendTime = currentTime;
  }
  
  // 短暫延遲以穩定讀數
  delay(10);
}