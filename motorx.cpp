#include "pxt.h"
using namespace pxt;

namespace motorx
{

    static const uint8_t PCA_ADDR = 0x40;
    static bool g_inited = false;
    static const uint8_t MODE1 = 0x00;
    static const uint8_t MODE2 = 0x01;
    static const uint8_t PRESCALE = 0xFE;
    static const uint8_t LED0_ON_L = 0x06;

    static void i2cWriteReg(uint8_t reg, uint8_t val)
    {
        uint8_t buf[2] = {reg, val};
#ifdef NRF51
        uBit.i2c.write(PCA_ADDR << 1, (char *)buf, 2, false);
#else
        uBit.i2c.write(PCA_ADDR << 1, buf, 2, false);
#endif
    }

    static uint8_t i2cReadReg(uint8_t reg)
    {
        uint8_t v = 0;
#ifdef NRF51
        uBit.i2c.write(PCA_ADDR << 1, (char *)&reg, 1, true);
        uBit.i2c.read(PCA_ADDR << 1, (char *)&v, 1, false);
#else
        uBit.i2c.write(PCA_ADDR << 1, &reg, 1, true);
        uBit.i2c.read(PCA_ADDR << 1, &v, 1, false);
#endif
        return v;
    }

    static void pca9685_setPWM(uint8_t ch, uint16_t on, uint16_t off)
    {
        uint8_t reg = LED0_ON_L + 4 * ch;
        uint8_t buf[5];
        buf[0] = reg;
        buf[1] = on & 0xFF;
        buf[2] = (on >> 8) & 0x0F;
        buf[3] = off & 0xFF;
        buf[4] = (off >> 8) & 0x0F;
#ifdef NRF51
        uBit.i2c.write(PCA_ADDR << 1, (char *)buf, 5, false);
#else
        uBit.i2c.write(PCA_ADDR << 1, buf, 5, false);
#endif
    }

    static void pca9685_setDuty(uint8_t ch, uint16_t duty4095)
    {
        if (duty4095 >= 4095)
            pca9685_setPWM(ch, 0, 4095);
        else
            pca9685_setPWM(ch, 0, duty4095);
    }

    // 初始化 PCA9685 (设置频率为 50Hz，适合舵机)
    static void initOnce()
    {
        if (g_inited)
            return;
        g_inited = true;

        i2cWriteReg(MODE1, 0x00); // Reset

        // 设置频率 50Hz (用于舵机)
        // 25MHz / 4096 / 50Hz - 1 = 121
        uint8_t prescale = 121;

        uint8_t oldmode = i2cReadReg(MODE1);
        uint8_t newmode = (oldmode & 0x7F) | 0x10; // Sleep
        i2cWriteReg(MODE1, newmode);
        i2cWriteReg(PRESCALE, prescale);
        i2cWriteReg(MODE1, oldmode);
        fiber_sleep(5);
        i2cWriteReg(MODE1, oldmode | 0xA1); // Auto-increment

        // 在初始化时将所有通道设为 1.5ms (1500us)
        for (int i = 0; i < 16; i++)
        {
            setServoPulseNative(i, 1500);
        }
    }

    // M1: PWM0, PWM1
    // M2: PWM3, PWM2
    // M3: PWM4, PWM5
    // M4: PWM7, PWM6

    static void motor_run(int motorId, int speed)
    {
        initOnce();
        if (speed > 100)
            speed = 100;
        if (speed < -100)
            speed = -100;

        uint16_t duty = (uint16_t)((abs(speed) * 4095) / 100);

        int chA = 0;
        int chB = 0;

        switch (motorId)
        {
        case 1:
            chA = 0;
            chB = 1;
            break; // M1
        case 2:
            chA = 2;
            chB = 3;
            break; // M2
        case 3:
            chA = 4;
            chB = 5;
            break; // M3
        case 4:
            chA = 6;
            chB = 7;
            break; // M4
        default:
            return;
        }

        if (speed > 0)
        {
            pca9685_setDuty(chA, duty);
            pca9685_setDuty(chB, 0);
        }
        else if (speed < 0)
        {
            pca9685_setDuty(chA, 0);
            pca9685_setDuty(chB, duty);
        }
        else
        {
            pca9685_setDuty(chA, 0);
            pca9685_setDuty(chB, 0);
        }
    }
    // === 💥 新增: 舵机控制函数 💥 ===
    // index: 0-15 (对应 PCA9685 的通道)
    // angle: 0-180 度
    static void servo_run(int index, int angle)
    {
        initOnce();
        if (index < 0 || index > 15)
            return;

        // 角度限制
        if (angle < 0)
            angle = 0;
        if (angle > 180)
            angle = 180;

        // 计算脉宽 (Pulse Width)
        // 50Hz 周期 = 20ms = 20000us
        // 0度 = 0.5ms = 500us
        // 180度 = 2.5ms = 2500us
        // map(angle, 0, 180, 500, 2500)
        int us = 500 + (angle * 2000 / 180);

        // 转换为 0-4095 (12-bit)
        // val = us * 4096 / 20000
        //     = us * 4096 / 20000 = us * 0.2048
        uint16_t val = (uint16_t)(us * 0.2048);

        pca9685_setPWM(index, 0, val);
    }

    static void servo_run_custom(int index, int angle)
    {
        initOnce();
        if (index < 0 || index > 15)
            return;
        if (angle < 0)
            angle = 0;
        if (angle > 180)
            angle = 180;

        // 重新映射：0度=1000us, 180度=2000us
        // 中位 90度时：1000 + 90 * (1000/180) = 1500us
        int us = 1000 + (angle * 1000 / 180);

        // 转换为 PCA9685 的 12-bit 数值
        uint16_t val = (uint16_t)(us * 0.2048);
        pca9685_setPWM(index, 0, val);
    }

    // === 新增: 脉宽直接控制 (用于360舵机精细调速) ===
    // pulse_us: 500 - 2500
    static void servo_pulse(int index, int pulse_us)
    {
        initOnce();
        if (index < 0 || index > 15)
            return;
        uint16_t val = (uint16_t)(pulse_us * 0.2048);
        pca9685_setPWM(index, 0, val);
    }

    static const int8_t QDEC_TABLE[16] = {0, 1, -1, 0, -1, 0, 0, 1, 1, 0, 0, -1, 0, -1, 1, 0};
    struct QDec
    {
        MicroBitPin *A;
        MicroBitPin *B;
        volatile int32_t count;
        uint8_t prev;
    };
    static QDec encLeft;
    static QDec encRight;
    static bool enc_inited = false;
    static inline uint8_t readAB(QDec &e) { return ((uint8_t)e.A->getDigitalValue() << 1) | (uint8_t)e.B->getDigitalValue(); }
    static void onEncLeftEvent(MicroBitEvent)
    {
        uint8_t curr = readAB(encLeft);
        encLeft.count += QDEC_TABLE[(encLeft.prev << 2) | curr];
        encLeft.prev = curr;
    }
    static void onEncRightEvent(MicroBitEvent)
    {
        uint8_t curr = readAB(encRight);
        encRight.count += QDEC_TABLE[(encRight.prev << 2) | curr];
        encRight.prev = curr;
    }
    static void encInitOnce()
    {
        if (enc_inited)
            return;
        enc_inited = true;
        encLeft.A = &uBit.io.P0;
        encLeft.B = &uBit.io.P1;
        encRight.A = &uBit.io.P2;
        encRight.B = &uBit.io.P8;
#ifdef NRF51
        encLeft.A->setPull(PullUp);
        encLeft.B->setPull(PullUp);
        encRight.A->setPull(PullUp);
        encRight.B->setPull(PullUp);
#else
        encLeft.A->setPull(codal::PullMode::Up);
        encLeft.B->setPull(codal::PullMode::Up);
        encRight.A->setPull(codal::PullMode::Up);
        encRight.B->setPull(codal::PullMode::Up);
#endif
        encLeft.count = 0;
        encLeft.prev = readAB(encLeft);
        encRight.count = 0;
        encRight.prev = readAB(encRight);
        encLeft.A->eventOn(MICROBIT_PIN_EVENT_ON_EDGE);
        encLeft.B->eventOn(MICROBIT_PIN_EVENT_ON_EDGE);
        encRight.A->eventOn(MICROBIT_PIN_EVENT_ON_EDGE);
        encRight.B->eventOn(MICROBIT_PIN_EVENT_ON_EDGE);
        uBit.messageBus.listen(MICROBIT_ID_IO_P0, MICROBIT_EVT_ANY, onEncLeftEvent);
        uBit.messageBus.listen(MICROBIT_ID_IO_P1, MICROBIT_EVT_ANY, onEncLeftEvent);
        uBit.messageBus.listen(MICROBIT_ID_IO_P2, MICROBIT_EVT_ANY, onEncRightEvent);
        uBit.messageBus.listen(MICROBIT_ID_IO_P8, MICROBIT_EVT_ANY, onEncRightEvent);
    }

    // ===================== SHIMS =====================
    //% shim=motorx::initNative
    void initNative() { initOnce(); }
    //% shim=motorx::setMotorSpeedNative
    void setMotorSpeedNative(int id, int spd) { motor_run(id, spd); }
    //% shim=motorx::stopNative
    void stopNative()
    {
        initOnce();
        for (int i = 0; i <= 16; i++)
            pca9685_setDuty(i, 0);
    }
    //% shim=motorx::encResetNative
    void encResetNative()
    {
        encInitOnce();
        encLeft.count = 0;
        encRight.count = 0;
    }
    //% shim=motorx::encCountLeftNative
    int encCountLeftNative()
    {
        encInitOnce();
        return (int)encLeft.count;
    }
    //% shim=motorx::encCountRightNative
    int encCountRightNative()
    {
        encInitOnce();
        return (int)encRight.count;
    }
    //% shim=motorx::setServoAngleNative
    void setServoAngleNative(int id, int angle) { servo_run(id, angle); }
    //% shim=motorx::setCustomServoAngleNative
    void setCustomServoAngleNative(int id, int angle) { servo_run_custom(id, angle); }
    //% shim=motorx::setServoPulseNative
    void setServoPulseNative(int id, int us) { servo_pulse(id, us);}
}