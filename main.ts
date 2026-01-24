 enum MotorList {
    //% block="M1 前左"
    M1 = 1,
    //% block="M2 前右"
    M2 = 2,
    //% block="M3 后左"
    M3 = 3,
    //% block="M4 后右"
    M4 = 4,
    //% block="全部电机"
    All = 99
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

enum MoveDir {
    //% block="前进"
    Forward,
    //% block="后退"
    Back,
    //% block="左平移"
    Left,
    //% block="右平移"
    Right,
    //% block="左上"
    LeftFront,
    //% block="右上"
    RightFront,
    //% block="左下"
    LeftBack,
    //% block="右下"
    RightBack
}

//% color=#FF7A00 icon="\uf1b9" block="机器人控制"
namespace motorx {

    let lineLogic = 1; 

    //% block="初始化 驱动板"
    //% weight=100
    export function init(): void {
        initNative();
    }

    // ===========================
    //    通用控制 (适用于 2轮 & 4轮)
    // ===========================

    /**
     * 设置单个电机速度
     */
    //% block="设置 %motor 速度 %speed"
    //% speed.min=-100 speed.max=100
    //% group="通用"
    //% weight=90
    export function setSpeed(motor: MotorList, speed: number): void {
        if (motor === MotorList.All) {
            setMotorSpeedNative(1, speed);
            setMotorSpeedNative(2, speed);
            setMotorSpeedNative(3, speed);
            setMotorSpeedNative(4, speed);
        } else {
            setMotorSpeedNative(motor, speed);
        }
    }

    //% block="停止 %motor"
    //% group="通用"
    //% weight=85
    export function stop(motor: MotorList): void {
        if (motor === MotorList.All) stopNative();
        else setMotorSpeedNative(motor, 0);
    }

    // ===========================
    //    四轮麦克纳姆轮 (Mecanum)
    // ===========================

    /**
     * 麦克纳姆轮移动控制
     * 矢量原理：
     * 前进: + + + +
     * 后退: - - - -
     * 左移: - + + - (M1反, M2正, M3正, M4反)
     * 右移: + - - + (M1正, M2反, M3反, M4正)
     */
    //% block="麦轮移动 方向 %dir 速度 %speed"
    //% speed.min=0 speed.max=100 speed.def=80
    //% group="四轮麦克纳姆"
    //% weight=80
    export function mecanumMove(dir: MoveDir, speed: number): void {
        let s = speed;
        switch (dir) {
            case MoveDir.Forward:
                setAll(s, s, s, s); break;
            case MoveDir.Back:
                setAll(-s, -s, -s, -s); break;
            case MoveDir.Left:
                setAll(-s, s, s, -s); break;
            case MoveDir.Right:
                setAll(s, -s, -s, s); break;
            case MoveDir.LeftFront:
                setAll(0, s, s, 0); break;
            case MoveDir.RightFront:
                setAll(s, 0, 0, s); break;
            case MoveDir.LeftBack:
                setAll(-s, 0, 0, -s); break;
            case MoveDir.RightBack:
                setAll(0, -s, -s, 0); break;
        }
    }

    //% block="麦轮原地旋转 %dir 速度 %speed"
    //% dir.shadow="toggleOnOff" dir.defl=true
    //% dir.on="向左" dir.off="向右"
    //% speed.min=0 speed.max=100 speed.def=80
    //% group="四轮麦克纳姆"
    //% weight=79
    export function mecanumSpin(left: boolean, speed: number): void {
        if (left) {
            setAll(speed, -speed, speed, -speed);
        } else {
            setAll(-speed, speed, -speed, speed);
        }
    }

    function setAll(m1: number, m2: number, m3: number, m4: number) {
        setMotorSpeedNative(1, m1);
        setMotorSpeedNative(2, m2);
        setMotorSpeedNative(3, m3);
        setMotorSpeedNative(4, m4);
    }

    // ===========================
    //    两轮差速 (Legacy Support)
    // ===========================

    /**
     * 强力巡线模式 (仅用于两轮车，使用 M1 和 M2)
     */
    //% block="强力巡线 (2轮) 满速 %speed"
    //% speed.min=0 speed.max=100 speed.def=100
    //% group="两轮差速"
    //% weight=60
    export function trackLineStrong(speed: number): void {
        // 读取传感器
        let s4 = (pins.digitalReadPin(DigitalPin.P12) == lineLogic) ? 1 : 0; 
        let s3 = (pins.digitalReadPin(DigitalPin.P13) == lineLogic) ? 1 : 0; 
        let s1 = (pins.digitalReadPin(DigitalPin.P14) == lineLogic) ? 1 : 0; 
        let s2 = (pins.digitalReadPin(DigitalPin.P15) == lineLogic) ? 1 : 0; 

        // 仅控制 M1 和 M2
        if ((s2 == 1 && s3 == 1) || (s1 == 0 && s2 == 1 && s3 == 0 && s4 == 0) || (s1 == 0 && s2 == 0 && s3 == 1 && s4 == 0)) {
            setMotorSpeedNative(1, speed); setMotorSpeedNative(2, speed);
        } else if (s3 == 0 && s2 == 1) {
            setMotorSpeedNative(1, 20); setMotorSpeedNative(2, speed);
        } else if (s1 == 1) {
            setMotorSpeedNative(1, -40); setMotorSpeedNative(2, speed);
        } else if (s3 == 1 && s4 == 0) {
            setMotorSpeedNative(1, speed); setMotorSpeedNative(2, 20);
        } else if (s4 == 1) {
            setMotorSpeedNative(1, speed); setMotorSpeedNative(2, -40);
        } else {
            setMotorSpeedNative(1, speed); setMotorSpeedNative(2, speed);
        }
    }

    //% block="设置巡线模式为 %color"
    //% group="两轮差速"
    //% weight=59
    export function setLineColor(color: LineColor): void {
        lineLogic = color;
    }

    //% block="传感器 %sensor 在线上"
    //% group="两轮差速"
    //% weight=58
    export function isLineDetected(sensor: LineSensor): boolean {
        return pins.digitalReadPin(sensor) === lineLogic;
    }

    //% block="读取 传感器 %sensor 原始值"
    //% group="两轮差速"
    //% weight=57
    export function getSensorValue(sensor: LineSensor): number {
        return pins.digitalReadPin(sensor);
    }

    // ===========================
    //    编码器 (辅助)
    // ===========================

    //% block="编码器 %motor 清零"
    //% group="编码器"
    //% weight=40
    export function encoderReset(motor: MotorList): void { encResetNative(); }

    //% block="读取 %motor 编码器计数"
    //% group="编码器"
    //% weight=39
    export function encoderCount(motor: MotorList): number {
        // 目前底层只实现了两路编码器
        if (motor === MotorList.M1) return encCountLeftNative();
        if (motor === MotorList.M2) return encCountRightNative();
        return 0;
    }

    // ===========================
    //    SHIMS (模拟器兼容)
    // ===========================
    //% shim=motorx::initNative
    function initNative(): void { console.log("Sim: Init PCA9685"); }
    
    //% shim=motorx::setMotorSpeedNative
    function setMotorSpeedNative(id: number, speed: number): void { 
        // 模拟器Log优化，只显示变化的电机
        console.log(`Sim: Motor M${id} -> Speed ${speed}`); 
    }
    
    //% shim=motorx::stopNative
    function stopNative(): void { console.log("Sim: Stop All"); }
    
    //% shim=motorx::encResetNative
    function encResetNative(): void { console.log("Sim: Reset Enc"); }
    
    //% shim=motorx::encCountLeftNative
    function encCountLeftNative(): number { return 0; }
    
    //% shim=motorx::encCountRightNative
    function encCountRightNative(): number { return 0; }
}
