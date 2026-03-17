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

enum DiffMoveDir {
    //% block="前进"
    Forward,
    //% block="后退"
    Backward,
    //% block="左转"
    TurnLeft,
    //% block="右转"
    TurnRight
}

enum CrossType {
    //% block="十字路口"
    Cross,
    //% block="左侧路口"
    LeftT,
    //% block="右侧路口"
    RightT
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

// 定义路口类型的下拉列表
enum IntersectionType {
    //% block="十字路口"
    Crossroad,
    //% block="左侧路口"
    LeftTurn,
    //% block="右侧路口"
    RightTurn,
    //% block="不停车(仅巡线)"
    None
}

// =================================================================
// 📦 命名空间 1: 基础硬件控制 (初始化/舵机/单电机/编码器)
// =================================================================

//% color=#FF7A00 icon="\uf1b9" block="机器人通用控制V1.01"
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

//% color=#0078D7 icon="\uf0b2" block="麦轮车"
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
                setAll(-s, -s, s, s); break;
            case MoveDir.Right:
                setAll(s, s, -s, -s); break;
            case MoveDir.LeftFront:
                setAll(s, 0, 0, s); break;
            case MoveDir.RightFront:
                setAll(0, s, s, 0); break;
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

    //% block="麦轮移动 方向 %dir 速度 %speed 持续 %time 秒"
    //% speed.min=0 speed.max=100 speed.def=80
    //% weight=78
    export function mecanumMoveTime(dir: MoveDir, speed: number, time: number): void {
        mecanumMove(dir, speed);      // 复用已有的移动逻辑（包含防重启保护）
        basic.pause(time * 1000);     // 延时指定的时间（秒转毫秒）
        mecanumMove(MoveDir.Stop, 0); // 时间到后停止
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
// 🚜 命名空间 3: 差速/巡线控制 (双轮模式)
// =================================================================

//% color=#E65100 icon="\uf018" block="巡线车"
namespace diffRobot {

    let lineLogic = 0; // 默认黑线（地面白）
    //% block="遇 %stopType 停车，强力巡线 (2驱) 满速 %speed"
    //% speed.min=0 speed.max=100 speed.def=100
    //% weight=60
    export function trackLineStrongStop(stopType: IntersectionType, speed: number): void {
        // 1. 获取传感器状态
        let farLeft = (pins.digitalReadPin(LineSensor.X2) == lineLogic) ? 1 : 0; // 最左侧
        let innerLeft = (pins.digitalReadPin(LineSensor.X1) == lineLogic) ? 1 : 0; // 中间偏左
        let innerRight = (pins.digitalReadPin(LineSensor.X3) == lineLogic) ? 1 : 0; // 中间偏右
        let farRight = (pins.digitalReadPin(LineSensor.X4) == lineLogic) ? 1 : 0; // 最右侧

        // 💡 优先级 1：识别路口并决定是停车还是继续执行原动作
        if (farLeft && farRight) {
            // [十字路口 / 尽头丁字路口]：最左和最右都压线
            if (stopType == IntersectionType.Crossroad) {
                set2GroupSpeed(0, 0); // 目标路口，停车
                return;               // 退出函数，保持停车状态
            } else {
                set2GroupSpeed(speed, speed); // 非目标路口，按原逻辑直行冲过
            }
        }
        else if (farLeft && (innerLeft || innerRight)) {
            // [左侧岔路口 / 左直角弯]：最左压线，且中间也压线
            if (stopType == IntersectionType.LeftTurn) {
                set2GroupSpeed(0, 0); // 目标路口，停车
                return;
            } else {
                set2GroupSpeed(0, speed + 20); // 非目标路口，按原逻辑强力左转
            }
        }
        else if (farRight && (innerLeft || innerRight)) {
            // [右侧岔路口 / 右直角弯]：最右压线，且中间也压线
            if (stopType == IntersectionType.RightTurn) {
                set2GroupSpeed(0, 0); // 目标路口，停车
                return;
            } else {
                set2GroupSpeed(speed + 20, 0); // 非目标路口，按原逻辑强力右转
            }
        }

        // 💡 优先级 2：正常巡线微调 (中间两个传感器发生偏移)
        else if (innerLeft && innerRight) {
            // 完美居中：直行
            set2GroupSpeed(speed, speed);
        }
        else if (innerLeft && !innerRight) {
            // 只有左边中间压线：车头偏右，需要向左微调
            set2GroupSpeed(speed - 10, speed + 10);
        }
        else if (!innerLeft && innerRight) {
            // 只有右边中间压线：车头偏左，需要向右微调
            set2GroupSpeed(speed + 10, speed - 10);
        }

        // 💡 优先级 3：极端偏移补救
        else if (farLeft) {
            // 只有最左侧压线（中间全脱离）：极限左转找线
            set2GroupSpeed(-10, speed + 20);
        }
        else if (farRight) {
            // 只有最右侧压线（中间全脱离）：极限右转找线
            set2GroupSpeed(speed + 20, -10);
        }

        // 💡 优先级 4：完全脱线
        else {
            // 全白或全黑未识别到：后退寻找线
            set2GroupSpeed(speed, speed);
        }
    }

    // 辅助函数
    function set2GroupSpeed(leftSpeed: number, rightSpeed: number) {
        motorx._internalSetMotor(3, leftSpeed); // M3 (右前) 
        motorx._internalSetMotor(1, rightSpeed); // M1 (左前) 
    }

    // 辅助函数：同时设置左侧(M1,M3)和右侧(M2,M4)的速度
    function setGroupSpeed(leftSpeed: number, rightSpeed: number) {
        motorx._internalSetMotor(1, leftSpeed); // M1
        motorx._internalSetMotor(3, leftSpeed); // M3
        motorx._internalSetMotor(2, rightSpeed); // M2
        motorx._internalSetMotor(4, rightSpeed); // M4
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

    // ===========================
    //    扩展：时间与传感器控制
    // ===========================

    //% block="以 %speed 速度 %dir 持续 %time 秒"
    //% speed.min=0 speed.max=100 speed.def=80
    //% weight=54
    export function moveTime(speed: number, dir: DiffMoveDir, time: number): void {
        if (dir == DiffMoveDir.Forward) set2GroupSpeed(speed, speed);
        else if (dir == DiffMoveDir.Backward) set2GroupSpeed(-speed, -speed);
        else if (dir == DiffMoveDir.TurnLeft) set2GroupSpeed(-speed, speed);
        else if (dir == DiffMoveDir.TurnRight) set2GroupSpeed(speed, -speed);

        basic.pause(time * 1000);
        set2GroupSpeed(0, 0);
    }

    //% block="以 %speed 速度 %dir 直到传感器 %sensor 触发"
    //% speed.min=0 speed.max=100 speed.def=80
    //% weight=53
    export function moveUntilSensor(speed: number, dir: DiffMoveDir, sensor: LineSensor): void {
        if (dir == DiffMoveDir.Forward) set2GroupSpeed(speed, speed);
        else if (dir == DiffMoveDir.Backward) set2GroupSpeed(-speed, -speed);
        else if (dir == DiffMoveDir.TurnLeft) set2GroupSpeed(-speed, speed);
        else if (dir == DiffMoveDir.TurnRight) set2GroupSpeed(speed, -speed);

        // 循环等待，直到指定的传感器检测到线
        while (!isLineDetected(sensor)) {
            basic.pause(10);
        }
        set2GroupSpeed(0, 0);
    }

    // ===========================
    //    扩展：高级巡线
    // ===========================

    //% block="巡线 速度 %speed 持续 %time 秒"
    //% speed.min=0 speed.max=100 speed.def=80
    //% weight=52
    export function trackLineTime(speed: number, time: number): void {
        let start = input.runningTime(); // 获取当前运行的毫秒数
        while (input.runningTime() - start < time * 1000) {
            trackLineStrong(speed); // 复用你的强力巡线逻辑
            basic.pause(10); // 释放CPU，防止死锁
        }
        set2GroupSpeed(0, 0);
    }

    //% block="巡线 速度 %speed 直到遇到 %crossType"
    //% speed.min=0 speed.max=100 speed.def=80
    //% weight=51
    export function trackLineUntilCross(speed: number, crossType: CrossType): void {
        while (true) {
            // 根据 trackLineStrong 逻辑推理：X2是左侧(控制右转)，X4是右侧(控制左转)
            let s2 = isLineDetected(LineSensor.X2);
            let s4 = isLineDetected(LineSensor.X4);

            // 判断路口类型
            if (crossType == CrossType.Cross && s2 && s4) break;
            else if (crossType == CrossType.LeftT && s2) break;
            else if (crossType == CrossType.RightT && s4) break;

            trackLineStrong(speed);
            basic.pause(10);
        }
        set2GroupSpeed(0, 0); // 遇到路口后刹车
    }
}






