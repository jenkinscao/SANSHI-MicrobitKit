// ===========================
//       枚举定义 (通用)
// ===========================

enum MotorList {
    //% block="M1 前左"
    M1 = 1,
    //% block="M2 后左"
    M2 = 2,
    //% block="M3 前右"
    M3 = 3,
    //% block="M4 后右"
    M4 = 4,
    //% block="全部电机"
    All = 99
}

enum LineSensor {
    //% block="X1 (P10)"
    X1 = DigitalPin.P10,
    //% block="X2 (P7)"
    X2 = DigitalPin.P7,
    //% block="X3 (P6)"
    X3 = DigitalPin.P6,
    //% block="X4 (P4)"
    X4 = DigitalPin.P4
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
    RightBack,
    //% block="停止"
    Stop = 99
}

// =================================================================
// 📦 命名空间 1: 基础硬件控制 (初始化/舵机/单电机/编码器)
// =================================================================

//% color=#FF7A00 icon="\uf1b9" block="机器人通用控制V1.00"
namespace motorx {

    //% block="初始化 驱动板"
    //% weight=100
    export function init(): void {
        initNative();
        // 初始化时先停止一次
        stopNative();
    }

    // ===========================
    //    电机基础控制
    // ===========================

    /**
     * 设置单个电机速度
     */
    //% block="设置 %motor 速度 %speed"
    //% speed.min=-100 speed.max=100
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
    //% weight=85
    export function stop(motor: MotorList): void {
        if (motor === MotorList.All) {
            stopNative();
            // 通知麦轮模块重置状态(如果需要，但这层解耦了，由麦轮模块自己管理)
        }
        else setMotorSpeedNative(motor, 0);
    }

    // 供其他命名空间调用的内部导出函数
    export function _internalSetMotor(id: number, speed: number) {
        setMotorSpeedNative(id, speed);
    }
    
    export function _internalStop() {
        stopNative();
    }


    // ===========================
    //    舵机控制
    // ===========================

    /**
     * 设置180度标准舵机角度
     */
    //% block="设置 180°舵机 S%pin 角度为 %angle"
    //% pin.min=0 pin.max=15
    //% angle.min=0 angle.max=180
    //% group="舵机控制"
    //% weight=30
    export function setServoAngle(pin: number, angle: number): void {
        setServoAngleNative(pin, angle);
    }

    /**
     * 设置180度私有舵机角度
     */
    //% block="设置 180°私有舵机 S%pin 角度为 %angle"
    //% pin.min=0 pin.max=15
    //% angle.min=0 angle.max=180
    //% group="舵机控制"
    //% weight=30
    export function setCustomServoAngle(pin: number, angle: number): void {
        setCustomServoAngleNative(pin, angle); 
    }

    /**
     * 设置360度连续旋转舵机速度
     */
    //% block="设置 360°舵机 S%pin 速度 %speed\\%"
    //% pin.min=0 pin.max=15
    //% speed.min=-100 speed.max=100
    //% group="舵机控制"
    //% weight=29
    export function setServoSpeed(pin: number, speed: number): void {
        // 映射速度 -100~100 到脉宽 1000~2000us
        let us = 1500 + (speed * 5);
        setServoPulseNative(pin, us);
    }

    /**
     * 关闭舵机
     */
    //% block="关闭舵机 S%pin (释放)"
    //% pin.min=0 pin.max=15
    //% group="舵机控制"
    //% weight=28
    export function stopServo(pin: number): void {
        setServoPulseNative(pin, 0);
    }

    // ===========================
    //    SHIMS (底层接口)
    //    必须保留在 motorx 命名空间下以匹配 C++ 定义
    // ===========================
    
    //% shim=motorx::initNative
    function initNative(): void { console.log("Sim: Init PCA9685"); }
    
    //% shim=motorx::setMotorSpeedNative
    function setMotorSpeedNative(id: number, speed: number): void { 
        console.log(`Sim: Motor M${id} -> Speed ${speed}`); 
    }
    
    //% shim=motorx::stopNative
    function stopNative(): void { console.log("Sim: Stop All"); }
    


    //% shim=motorx::setServoAngleNative
    function setServoAngleNative(id: number, angle: number): void {
        console.log(`Sim: Servo S${id} -> Angle ${angle}`);
    }

    //% shim=motorx::setServoPulseNative
    function setServoPulseNative(id: number, us: number): void {
        console.log(`Sim: Servo S${id} -> Pulse ${us}us`);
    }
    //% shim=motorx::setCustomServoAngleNative
    function setCustomServoAngleNative(id: number, angle: number): void {
        console.log(`Sim: Custom Servo S${id} -> Angle ${angle}`);
    }

    //% shim=motorx::encResetNative
    export function encResetNative(): void { console.log("Sim: Reset Enc"); }
    
    //% shim=motorx::encCountLeftNative
    export function encCountLeftNative(): number { return 0; }
    
    //% shim=motorx::encCountRightNative
    export function encCountRightNative(): number { return 0; }
}

// =================================================================
// 🎮 命名空间 2: 麦克纳姆轮控制 (四轮全向)
// =================================================================

//% color=#0078D7 icon="\uf047" block="麦轮车"
namespace mecanumRobot {
    
    // 变量：记录上一次的运动状态，用于防反向冲击
    let lastMoveState = MoveDir.Stop; 

    //% block="麦轮移动 方向 %dir 速度 %speed"
    //% speed.min=0 speed.max=100 speed.def=80
    //% weight=80
    export function mecanumMove(dir: MoveDir, speed: number): void {
        // === ⚡ 核心修改：防重启保护逻辑 ⚡ ===
        if (dir != lastMoveState && lastMoveState != MoveDir.Stop) {
            motorx._internalStop();
            basic.pause(100); 
        }
        
        lastMoveState = dir;
        // ========================================

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
            case MoveDir.Stop:
                motorx._internalStop(); break;
        }
    }

    //% block="麦轮原地旋转 %dir 速度 %speed"
    //% dir.shadow="toggleOnOff" dir.defl=true
    //% dir.on="向左" dir.off="向右"
    //% speed.min=0 speed.max=100 speed.def=80
    //% weight=79
    export function mecanumSpin(left: boolean, speed: number): void {
        // 旋转状态特殊ID标记：100(左) 和 101(右)
        let spinState = left ? 100 : 101;
        
        if (spinState != lastMoveState && lastMoveState != MoveDir.Stop) {
            motorx._internalStop();
            basic.pause(100); 
        }
        lastMoveState = spinState;

        if (left) {
            setAll(speed, speed, -speed, -speed);
        } else {
            setAll(-speed, -speed, speed, speed);
        }
    }

    // 内部帮助函数
    function setAll(m1: number, m2: number, m3: number, m4: number) {
        motorx._internalSetMotor(1, m1);
        motorx._internalSetMotor(2, m2);
        motorx._internalSetMotor(3, m3);
        motorx._internalSetMotor(4, m4);
    }
}

// =================================================================
// 🚜 命名空间 3: 差速/巡线控制 (双轮/四轮坦克模式)
// =================================================================

//% color=#E65100 icon="\uf018" block="巡线/坦克车"
namespace diffRobot {

    let lineLogic = 1; 

    //% block="强力巡线 (4驱) 满速V1 %speed"
    //% speed.min=0 speed.max=100 speed.def=100
    //% weight=60
    export function trackLineStrong(speed: number): void {
        let s4 = (pins.digitalReadPin(LineSensor.X4) == lineLogic) ? 1 : 0; 
        let s3 = (pins.digitalReadPin(LineSensor.X3) == lineLogic) ? 1 : 0; 
        let s1 = (pins.digitalReadPin(LineSensor.X1) == lineLogic) ? 1 : 0; 
        let s2 = (pins.digitalReadPin(LineSensor.X2) == lineLogic) ? 1 : 0; 

        // 💡 逻辑：左侧(M1+M3) 右侧(M2+M4)
        
        // 1. 全黑或全白 -> 直行
        if ((s2 == 1 && s3 == 1) || (s1 == 0 && s2 == 1 && s3 == 0 && s4 == 0) || (s1 == 0 && s2 == 0 && s3 == 1 && s4 == 0)) {
            setTwoGroupSpeed(speed, speed); 
        } 
        // 2. 极右 -> 左轮减速，右轮满速
        else if (s3 == 0 && s2 == 1) {
            setTwoGroupSpeed(20, speed);
        } 
        // 3. 偏右 -> 左轮反转，右轮满速
        else if (s1 == 1) {
            setTwoGroupSpeed(40, speed);
        } 
        // 4. 偏左 -> 左轮满速，右轮减速
        else if (s3 == 1 && s4 == 0) {
            setTwoGroupSpeed(speed, 20);
        } 
        // 5. 极左 -> 左轮满速，右轮反转
        else if (s4 == 1) {
            setTwoGroupSpeed(speed, 40);
        } 
        // 默认直行
        else {
            setTwoGroupSpeed(speed, speed);
        }
    }

    // 辅助函数：同时设置左侧(M1,M3)和右侧(M2,M4)的速度
    function setGroupSpeed(leftSpeed: number, rightSpeed: number) {
        motorx._internalSetMotor(1, leftSpeed); // M1
        motorx._internalSetMotor(3, leftSpeed); // M3
        motorx._internalSetMotor(2, rightSpeed); // M2
        motorx._internalSetMotor(4, rightSpeed); // M4
    }

    function setTwoGroupSpeed(leftSpeed: number, rightSpeed: number) {
        motorx._internalSetMotor(1, -leftSpeed); // M1
        motorx._internalSetMotor(3, -rightSpeed); // M3
    }

    //% block="设置巡线模式为 %color"
    //% weight=59
    export function setLineColor(color: LineColor): void {
        lineLogic = color;
    }

    //% block="传感器 %sensor 在线上"
    //% weight=58
    export function isLineDetected(sensor: LineSensor): boolean {
        return pins.digitalReadPin(sensor) === lineLogic;
    }

    //% block="读取 传感器 %sensor 原始值"
    //% weight=57
    export function getSensorValue(sensor: LineSensor): number {
        return pins.digitalReadPin(sensor);
    }

    // ===========================
    //    编码器 (辅助)
    // ===========================

    //% block="编码器 %motor 清零"
    //% group="编码器"
    //% weight=56
    export function encoderReset(motor: MotorList): void { motorx.encResetNative(); }

    //% block="读取 %motor 编码器计数"
    //% group="编码器"
    //% weight=55
    export function encoderCount(motor: MotorList): number {
        if (motor === MotorList.M1) return motorx.encCountLeftNative();
        if (motor === MotorList.M2) return motorx.encCountRightNative();
        return 0;
    }
}



