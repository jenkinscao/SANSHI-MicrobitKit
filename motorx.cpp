#include "pxt.h"
using namespace pxt;

namespace motorx {

// ===================== PCA9685 I2C 驱动 =====================
static const uint8_t PCA_ADDR = 0x40;
static bool g_inited = false;
static const uint8_t MODE1 = 0x00;
static const uint8_t MODE2 = 0x01; // 关键配置
static const uint8_t LED0_ON_L = 0x06;

static void i2cWriteReg(uint8_t reg, uint8_t val) {
    uint8_t buf[2] = {reg, val};
#ifdef NRF51
    uBit.i2c.write(PCA_ADDR << 1, (char*)buf, 2, false);
#else
    uBit.i2c.write(PCA_ADDR << 1, buf, 2, false);
#endif
}

static uint8_t i2cReadReg(uint8_t reg) {
    uint8_t v = 0;
#ifdef NRF51
    uBit.i2c.write(PCA_ADDR << 1, (char*)&reg, 1, true);
    uBit.i2c.read(PCA_ADDR << 1, (char*)&v, 1, false);
#else
    uBit.i2c.write(PCA_ADDR << 1, &reg, 1, true);
    uBit.i2c.read(PCA_ADDR << 1, &v, 1, false);
#endif
    return v;
}

static void pca9685_setPWM(uint8_t ch, uint16_t on, uint16_t off) {
    uint8_t reg = LED0_ON_L + 4 * ch;
    uint8_t buf[5];
    buf[0] = reg; buf[1] = on & 0xFF; buf[2] = (on >> 8) & 0x0F;
    buf[3] = off & 0xFF; buf[4] = (off >> 8) & 0x0F;
#ifdef NRF51
    uBit.i2c.write(PCA_ADDR << 1, (char*)buf, 5, false);
#else
    uBit.i2c.write(PCA_ADDR << 1, buf, 5, false);
#endif
}

static void pca9685_setDuty(uint8_t ch, uint16_t duty4095) {
    if (duty4095 >= 4095) pca9685_setPWM(ch, 0, 4095);
    else pca9685_setPWM(ch, 0, duty4095);
}

static void initOnce() {
    if (g_inited) return;
    g_inited = true;
    
    // 修复：强制配置为推挽输出 (Totem Pole)，解决电压被拉低问题
    i2cWriteReg(MODE1, 0x00); // 复位
    i2cWriteReg(MODE2, 0x04); // OUTDRV=1
    
    // 设置频率 50Hz
    i2cWriteReg(MODE1, 0x20 | 0x01); 
    float prescaleval = 25000000.0f / 4096.0f / 50.0f - 1.0f;
    uint8_t prescale = (uint8_t)(prescaleval + 0.5f);
    uint8_t oldmode = i2cReadReg(MODE1);
    i2cWriteReg(MODE1, (oldmode & 0x7F) | 0x10);
    i2cWriteReg(PRESCALE, prescale);
    i2cWriteReg(MODE1, oldmode);
    fiber_sleep(5);
    i2cWriteReg(MODE1, oldmode | 0xA1); 
    
    // 初始全停
    for (int ch = 0; ch < 16; ch++) pca9685_setDuty((uint8_t)ch, 0);
}

// ===================== 电机控制 (修正极性) =====================
static void motor_run(int motorId, int speed) {
    initOnce();
    if (speed > 100) speed = 100;
    if (speed < -100) speed = -100;
    
    uint16_t duty = (uint16_t)((abs(speed) * 4095) / 100);
    
    int chA = 0; 
    int chB = 0; 

    // 根据你的测试结果，我调整了这里的 A/B 顺序
    switch(motorId) {
        case 1: // M1 前左 (修正：之前是0/1，导致反转，现在改为1/0)
            chA = 1; chB = 0; 
            break;
        case 2: // M2 前右 (保持：之前测得是正数)
            chA = 3; chB = 2; 
            break;
        case 3: // M3 后左 (通常与M1同侧，我预先修正为 5/4)
            chA = 5; chB = 4; 
            break;
        case 4: // M4 后右 (通常与M2同侧，保持 7/6)
            chA = 7; chB = 6; 
            break;
        default: return;
    }

    if (speed > 0) {
        // 正转
        pca9685_setDuty(chA, duty); pca9685_setDuty(chB, 0);
    } else if (speed < 0) {
        // 反转
        pca9685_setDuty(chA, 0); pca9685_setDuty(chB, duty);
    } else {
        // 停止
        pca9685_setDuty(chA, 0); pca9685_setDuty(chB, 0);
    }
}

// ===================== 编码器 (保持不变) =====================
static const int8_t QDEC_TABLE[16] = {0, 1, -1, 0, -1, 0, 0, 1, 1, 0, 0, -1, 0, -1, 1, 0};
struct QDec { MicroBitPin *A; MicroBitPin *B; volatile int32_t count; uint8_t prev; };
static QDec encLeft;
static QDec encRight;
static bool enc_inited = false;
static inline uint8_t readAB(QDec &e) { return ((uint8_t)e.A->getDigitalValue() << 1) | (uint8_t)e.B->getDigitalValue(); }
static void onEncLeftEvent(MicroBitEvent) { uint8_t curr = readAB(encLeft); encLeft.count += QDEC_TABLE[(encLeft.prev << 2) | curr]; encLeft.prev = curr; }
static void onEncRightEvent(MicroBitEvent) { uint8_t curr = readAB(encRight); encRight.count += QDEC_TABLE[(encRight.prev << 2) | curr]; encRight.prev = curr; }
static void encInitOnce() {
    if (enc_inited) return; enc_inited = true;
    encLeft.A = &uBit.io.P0; encLeft.B = &uBit.io.P1; encRight.A = &uBit.io.P2; encRight.B = &uBit.io.P8;
#ifdef NRF51
    encLeft.A->setPull(PullUp); encLeft.B->setPull(PullUp); encRight.A->setPull(PullUp); encRight.B->setPull(PullUp);
#else
    encLeft.A->setPull(codal::PullMode::Up); encLeft.B->setPull(codal::PullMode::Up); encRight.A->setPull(codal::PullMode::Up); encRight.B->setPull(codal::PullMode::Up);
#endif
    encLeft.count = 0; encLeft.prev = readAB(encLeft); encRight.count = 0; encRight.prev = readAB(encRight);
    encLeft.A->eventOn(MICROBIT_PIN_EVENT_ON_EDGE); encLeft.B->eventOn(MICROBIT_PIN_EVENT_ON_EDGE);
    encRight.A->eventOn(MICROBIT_PIN_EVENT_ON_EDGE); encRight.B->eventOn(MICROBIT_PIN_EVENT_ON_EDGE);
    uBit.messageBus.listen(MICROBIT_ID_IO_P0, MICROBIT_EVT_ANY, onEncLeftEvent); uBit.messageBus.listen(MICROBIT_ID_IO_P1, MICROBIT_EVT_ANY, onEncLeftEvent);
    uBit.messageBus.listen(MICROBIT_ID_IO_P2, MICROBIT_EVT_ANY, onEncRightEvent); uBit.messageBus.listen(MICROBIT_ID_IO_P8, MICROBIT_EVT_ANY, onEncRightEvent);
}

// ===================== SHIMS =====================
//% shim=motorx::initNative
void initNative() { initOnce(); }
//% shim=motorx::setMotorSpeedNative
void setMotorSpeedNative(int id, int spd) { motor_run(id, spd); }
//% shim=motorx::stopNative
void stopNative() { initOnce(); for(int i=0; i<=7; i++) pca9685_setDuty(i, 0); }
//% shim=motorx::encResetNative
void encResetNative() { encInitOnce(); encLeft.count = 0; encRight.count = 0; }
//% shim=motorx::encCountLeftNative
int encCountLeftNative() { encInitOnce(); return (int)encLeft.count; }
//% shim=motorx::encCountRightNative
int encCountRightNative() { encInitOnce(); return (int)encRight.count; }
}
