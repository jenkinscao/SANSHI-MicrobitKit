enum MotorList {
    //% block="M1 左电机"
    M1 = 1,
    //% block="M2 右电机"
    M2 = 2,
    //% block="全部电机"
    All = 3
}

enum LineSensor {
    //% block="X1 (P12)"
    X1 = DigitalPin.P12,
    //% block="X2 (P13)"
    X2 = DigitalPin.P13,
    //% block="X3 (P14)"
    X3 = DigitalPin.P14,
    //% block="X4 (P15)"
    X4 = DigitalPin.P15
}

enum LineColor {
    //% block="黑线 (地面白)"
    Black = 0,
    //% block="白线 (地面黑)"
    White = 1
}

//% color=#FF7A00 icon="\uf1b9" block="机器人控制"
namespace motorx {

    let lineLogic = 1; 

    //% block="初始化 驱动板"
    //% weight=100
    export function init(): void {
        initNative();
    }

    //% block="设置巡线模式为 %color"
    //% weight=99
    export function setLineColor(color: LineColor): void {
        lineLogic = color;
    }

    // ===========================
    //    暴力巡线 (针对低速电机优化)
    // ===========================

    /**
     * 强力巡线模式
     * 针对动力不足的车，放弃PID微调，采用直接的差速转向
     * @param speed 基础速度 (建议填 100)
     */
    //% block="强力巡线 满速 %speed"
    //% speed.min=0 speed.max=100 speed.def=100
    //% weight=95
    export function trackLineStrong(speed: number): void {
        // 读取传感器 (在线=1, 离线=0)
        let s4 = (pins.digitalReadPin(DigitalPin.P12) == lineLogic) ? 1 : 0; // 最左
        let s3 = (pins.digitalReadPin(DigitalPin.P13) == lineLogic) ? 1 : 0; // 左
        let s1 = (pins.digitalReadPin(DigitalPin.P14) == lineLogic) ? 1 : 0; // 右
        let s2 = (pins.digitalReadPin(DigitalPin.P15) == lineLogic) ? 1 : 0; // 最右

        // 状态判定逻辑
        
        // 1. 直行 (中间两个压线，或者两边都没压线只剩中间)
        if ((s2 == 1 && s3 == 1) || (s1 == 0 && s2 == 1 && s3 == 0 && s4 == 0) || (s1 == 0 && s2 == 0 && s3 == 1 && s4 == 0)) {
            // 全力冲刺
            setSpeed(MotorList.M1, speed);
            setSpeed(MotorList.M2, speed);
        }
        // 2. 小左转 (左边的传感器压线)
        else if (s3 == 0 && s2 == 1) {
            // 左轮不动(或微动)，右轮满速
            setSpeed(MotorList.M1, 20); 
            setSpeed(MotorList.M2, speed);
        }
        // 3. 急左转 (最左边的传感器压线)
        else if (s1 == 1) {
            // 左轮倒转(急刹)，右轮满速 -> 原地旋转效果
            setSpeed(MotorList.M1, -40); 
            setSpeed(MotorList.M2, speed);
        }
        // 4. 小右转 (右边的传感器压线)
        else if (s3 == 1 && s4 == 0) {
            // 右轮不动，左轮满速
            setSpeed(MotorList.M1, speed);
            setSpeed(MotorList.M2, 20);
        }
        // 5. 急右转 (最右边的传感器压线)
        else if (s4 == 1) {
            // 右轮倒转，左轮满速
            setSpeed(MotorList.M1, speed);
            setSpeed(MotorList.M2, -40);
        }
        // 6. 全白(丢线) 或 全黑(十字路口) -> 保持直行或停
        else {
            // 默认保持直行，或者你可以改成 stop
            setSpeed(MotorList.M1, speed);
            setSpeed(MotorList.M2, speed);
        }
    }

    // ===========================
    //    其他基础积木 (保留)
    // ===========================

    //% block="传感器 %sensor 在线上"
    //% weight=75
    export function isLineDetected(sensor: LineSensor): boolean {
        return pins.digitalReadPin(sensor) === lineLogic;
    }

    //% block="读取 传感器 %sensor 原始值"
    //% weight=70
    export function getSensorValue(sensor: LineSensor): number {
        return pins.digitalReadPin(sensor);
    }

    //% block="设置 %motor 速度 %speed"
    //% speed.min=-100 speed.max=100
    //% weight=90
    export function setSpeed(motor: MotorList, speed: number): void {
        if (motor === MotorList.M1) setMotorSpeedNative(1, speed);
        else if (motor === MotorList.M2) setMotorSpeedNative(2, speed);
        else { setMotorSpeedNative(1, speed); setMotorSpeedNative(2, speed); }
    }

    //% block="停止 %motor"
    //% weight=85
    export function stop(motor: MotorList): void {
        if (motor === MotorList.M1) setMotorSpeedNative(1, 0);
        else if (motor === MotorList.M2) setMotorSpeedNative(2, 0);
        else stopNative();
    }

    //% block="编码器 %motor 清零"
    //% weight=70
    export function encoderReset(motor: MotorList): void { encResetNative(); }

    //% block="读取 %motor 编码器计数"
    //% weight=60
    export function encoderCount(motor: MotorList): number {
        if (motor === MotorList.M1) return encCountLeftNative();
        if (motor === MotorList.M2) return encCountRightNative();
        return 0;
    }

    // ===========================
    //    SHIMS (模拟器兼容)
    // ===========================
    //% shim=motorx::initNative
    function initNative(): void { console.log("Sim: Init"); }
    //% shim=motorx::setMotorSpeedNative
    function setMotorSpeedNative(id: number, speed: number): void { console.log(`Sim: M${id} spd ${speed}`); }
    //% shim=motorx::stopNative
    function stopNative(): void { console.log("Sim: Stop"); }
    //% shim=motorx::encResetNative
    function encResetNative(): void { console.log("Sim: Reset Enc"); }
    //% shim=motorx::encCountLeftNative
    function encCountLeftNative(): number { return 0; }
    //% shim=motorx::encCountRightNative
    function encCountRightNative(): number { return 0; }
}