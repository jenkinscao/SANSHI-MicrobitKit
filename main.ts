enum LEDColor {
    //% block="红色"
    Red,
    //% block="绿色" 
    Green,
    //% block="蓝色"
    Blue,
    //% block="黄色"
    Yellow,
    //% block="紫色"
    Purple,
    //% block="青色"
    Cyan,
    //% block="白色"
    White,
    //% block="关闭"
    Off
}

enum ButtonEvent {
    //% block="按下"
    Pressed,
    //% block="弹起"
    Released,
    //% block="长按"
    LongPressed,
    //% block="长按弹起"
    LongReleased
}

enum ButtonState {
    Idle = -1,
    Released = 0,
    Pressed = 1,
    LongPressed = 2,
    LongReleased = 3
}

//% groups=["双色LED", "七彩LED", "轻触按键", "倾斜传感器", "振动传感器"，"干簧管传感器"]
namespace 三实智能 {

    // 按键状态管理
    interface ButtonManager {
        pin: DigitalPin;
        currentState: ButtonState;
        lastState: ButtonState;
        pressStartTime: number;
        longPressTime: number;
        debounceTime: number;
        lastDebounceTime: number;
        isPressed: boolean;
        wasLongPressed: boolean;
    }

    let buttonManagers: { [key: number]: ButtonManager } = {};
    let isRunning = false;
    let scanInterval = 50; // 扫描间隔时间(ms)

    let DualRedPin: DigitalPin = DigitalPin.P0;
    let DualGreenPin: DigitalPin = DigitalPin.P1;
    let DualLedInitialized: boolean = false;

    let TripleRedPin: DigitalPin = DigitalPin.P0;
    let TripleGreenPin: DigitalPin = DigitalPin.P1;
    let TripleBluePin: DigitalPin = DigitalPin.P2;
    let RgbLedInitialized: boolean = false;


    /**
     * 初始化双色LED引脚
     * @param redPin 红色LED引脚, eg: DigitalPin.P0
     * @param greenPin 绿色LED引脚, eg: DigitalPin.P1
     * 
     */
    //% block="初始化双色LED|红色引脚 $redPin|绿色引脚 $greenPin"
    //% blockId="init_dual_color_led"
    //% redPin.fieldEditor="gridpicker" redPin.fieldOptions.columns=4
    //% greenPin.fieldEditor="gridpicker" greenPin.fieldOptions.columns=4
    //% group="双色LED"
    //% weight=100
    export function initDualColorLed(redPin: DigitalPin, greenPin: DigitalPin): void {
        DualRedPin = redPin;
        DualGreenPin = greenPin;
        pins.digitalWritePin(DualRedPin, 0); // 初始化关闭红色LED
        pins.digitalWritePin(DualGreenPin, 0); // 初始化关闭绿色LED
        DualLedInitialized = true;
        basic.pause(1000);   // 确保引脚状态稳定
    }

    /**
     * 设置红色/绿色LED开关
     * @param redPin 红色LED引脚, eg: DigitalPin.P0
     * @param greenPin 绿色LED引脚, eg: DigitalPin.P1
     * @param color 选择颜色, eg: LEDColor.Red
     * @param state LED状态, eg: true
     */
    //% block="双色LED颜色为 $color 灯 $state"
    //% blockId="set_dual_color_led"
    //% state.shadow="toggleOnOff"
    //% state.defl=true
    //% group="双色LED"
    //% weight=90
    export function setDualColorLed(color: LEDColor, state: boolean): void {
        if(!DualLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }

        if (color == LEDColor.Red) {
            pins.digitalWritePin(DualRedPin, state ? 1 : 0);
            pins.digitalWritePin(DualGreenPin, 0); // 关闭绿色
        } else if (color == LEDColor.Green) {
            pins.digitalWritePin(DualGreenPin, state ? 1 : 0);
            pins.digitalWritePin(DualRedPin, 0); // 关闭红色
        }
    }

   /**
    * 单个引脚LED持续时间闪烁
    * @param color 选择颜色, eg: LEDColor.Red
    * @param times 闪烁次数, eg: 1
    * @param interval 闪烁间隔时间(ms), eg: 200
    */
    //% block="双色LED颜色为 $color 灯|闪烁次数 $times | 间隔时间(ms) $interval"
    //% blockId="blink_dual_color_led"
    //% times.min=1 times.max=20 times.defl=1
    //% interval.min=50 interval.max=2000 interval.defl=200
    //% group="双色LED"
    //% weight=80
    export function blinkDualColorLed(color: LEDColor, times: number, interval: number): void {
        if(!DualLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }
        for (let i = 0; i < times; i++) {
            setDualColorLed(color, true);
            basic.pause(interval);
            setDualColorLed(color, false);
            basic.pause(interval);
        }
    }

    /**
     * 双引脚LED切换闪烁
     * @param times 闪烁次数, eg: 1
     * @param interval 闪烁间隔时间(ms), eg: 200
     * */
    //% block="双色LED交替闪烁| 先亮$color |闪烁次数 $times | 间隔时间(ms) $interval"
    //% blockId="blink_both_color_led"
    //% times.min=1 times.max=20 times.defl=1
    //% interval.min=50 interval.max=2000 interval.defl=200
    //% group="双色LED"
    //% weight=70
    export function blinkBothColorLed(color: LEDColor, times: number, interval: number): void {
        if(!DualLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }
        let firstColor = color;
        let secondColor = (color == LEDColor.Red) ? LEDColor.Green : LEDColor.Red;

        for (let i = 0; i < times; i++) {
            if(firstColor == LEDColor.Red) {
                pins.digitalWritePin(DualGreenPin, 0); // 关闭绿色
                pins.digitalWritePin(DualRedPin, 1); // 打开红色
            }else {
                pins.digitalWritePin(DualRedPin, 0); // 关闭红色
                pins.digitalWritePin(DualGreenPin, 1); // 打开绿色
            }
            basic.pause(interval);
            if(secondColor == LEDColor.Green) {
                pins.digitalWritePin(DualRedPin, 0); // 关闭红色
                pins.digitalWritePin(DualGreenPin, 1); // 打开绿色
            }else {
                pins.digitalWritePin(DualGreenPin, 0); // 关闭绿色
                pins.digitalWritePin(DualRedPin, 1); // 打开红色
            }
            basic.pause(interval);
        }
        // 结束后关闭所有LED
        setDualColorLed(LEDColor.Red, false);   
    }

    /**
     * 双色LED呼吸灯
     * @param color 选择颜色, eg: LEDColor.Red
     * @param duration 呼吸周期时间(ms), eg: 2000
     * */
    //% block="双色LED颜色为 $color 呼吸灯|周期时间(ms) $duration"
    //% blockId="breathe_dual_color_led"
    //% duration.min=500 duration.max=10000 duration.defl=2000
    //% group="双色LED"
    //% weight=60
    export function breatheDualColorLed(color: LEDColor, duration: number): void {
        if(!DualLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }
        let pin = (color == LEDColor.Red) ? DualRedPin : DualGreenPin;
        let steps = 50; // 呼吸灯渐变步数
        let stepDelay = duration / (steps * 2); // 每步延时

        // 渐亮
        for (let i = 0; i <= steps; i++) {
            let brightness = Math.map(i, 0, steps, 0, 1023);
            pins.analogWritePin(pin, brightness);
            basic.pause(stepDelay);
        }

        // 渐灭
        for (let i = steps; i >= 0; i--) {
            let brightness = Math.map(i, 0, steps, 0, 1023);
            pins.analogWritePin(pin, brightness);
            basic.pause(stepDelay);
        }

        // 确保LED关闭
        pins.analogWritePin(pin, 0);
    }

    /**
     * 初始化七彩LED引脚
     * @param redPin 红色LED引脚, eg: DigitalPin.P1
     * @param greenPin 绿色LED引脚, eg: DigitalPin.P2
     * @param bluePin 蓝色LED引脚, eg: DigitalPin.P3
     * 
     * */
    //% block="初始化七彩LED|红色引脚 $redPin|绿色引脚 $greenPin|蓝色引脚 $bluePin"
    //% blockId="init_rgb_led"
    //% redPin.fieldEditor="gridpicker" redPin.fieldOptions.columns=4
    //% greenPin.fieldEditor="gridpicker" greenPin.fieldOptions.columns=4
    //% bluePin.fieldEditor="gridpicker" bluePin.fieldOptions.columns=4
    //% group="七彩LED"
    //% weight=100
    export function initRgbLed(redPin: DigitalPin, greenPin: DigitalPin, bluePin: DigitalPin): void {
        TripleRedPin = redPin;
        TripleGreenPin = greenPin;
        TripleBluePin = bluePin;
        pins.digitalWritePin(TripleRedPin, 0); // 初始化关闭红色LED
        pins.digitalWritePin(TripleGreenPin, 0); // 初始化关闭绿色LED
        pins.digitalWritePin(TripleBluePin, 0); // 初始化关闭蓝色LED
        RgbLedInitialized = true;
        basic.pause(1000);   // 确保引脚状态稳定
    }

    /**
     * 设置RGB颜色
     * @param red 红色分量(0-255), eg: 255
     * @param green 绿色分量(0-255), eg: 0
     * @param blue 蓝色分量(0-255), eg: 0
     * 
     */
    //% block="设置七彩LED颜色为 红:$red 绿:$green 蓝:$blue"
    //% blockId="set_rgb_color"
    //% red.min=0 red.max=255 red.defl=255
    //% green.min=0 green.max=255 green.defl=0
    //% blue.min=0 blue.max=255 blue.defl=0
    //% group="七彩LED"
    //% weight=90
    export function setRgbColor(red: number, green: number, blue: number): void {
        if(!RgbLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }
        // 将0-255范围映射到0-1023范围
        let redValue = Math.map(red, 0, 255, 0, 1023);
        let greenValue = Math.map(green, 0, 255, 0, 1023);
        let blueValue = Math.map(blue, 0, 255, 0, 1023);

        pins.analogWritePin(TripleRedPin, redValue);
        pins.analogWritePin(TripleGreenPin, greenValue);
        pins.analogWritePin(TripleBluePin, blueValue);
    }
    
    /**
     * 设置RGB颜色通过十六进制字符串
     * @param hexColor 十六进制颜色字符串, eg: "#FF0000"
     *  */
    //% block="设置七彩LED颜色为 十六进制字符串 $hexColor"
    //% blockId="set_rgb_color_hex"
    //% hexColor.defl="#FF0000"
    //% group="七彩LED"
    //% weight=80
    export function setRgbColorHex(hexColor: string): void {
        if(!RgbLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }
        // 移除可能的#号
        if (hexColor.charAt(0) == "#") {
            hexColor = hexColor.substr(1);
        }

        if (hexColor.length != 6) {
            basic.showString("ERR");
            return;
        }

        let red = parseInt(hexColor.substr(0, 2), 16);
        let green = parseInt(hexColor.substr(2, 2), 16);
        let blue = parseInt(hexColor.substr(4, 2), 16);

        setRgbColor(red, green, blue);
    }

    /**
     * RGB七彩单色呼吸灯 
     * @param color 选择颜色, eg: LEDColor.Red
     * @param duration 呼吸周期时间(ms), eg: 2000
     *  */
    //% block="七彩LED颜色为 $color 呼吸灯|周期时间(ms) $duration"
    //% blockId="breathe_rgb_color_led"
    //% duration.min=500 duration.max=10000 duration.defl=2000
    //% group="七彩LED"
    //% weight=70
    export function breatheRgbColorLed(color: LEDColor, duration: number): void {
        if(!RgbLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }
        let pin: DigitalPin;
        switch (color) {
            case LEDColor.Red:
                pin = TripleRedPin;
                break;
            case LEDColor.Green:
                pin = TripleGreenPin;
                break;
            case LEDColor.Blue:
                pin = TripleBluePin;
                break;
            case LEDColor.Yellow:
                pin = TripleRedPin; // 黄色由红色和绿色混合
                break;
            case LEDColor.Purple:
                pin = TripleRedPin; // 紫色由红色和蓝色混合
                break;
            case LEDColor.Cyan:
                pin = TripleGreenPin; // 青色由绿色和蓝色混合
                break;
            case LEDColor.White:
                pin = TripleRedPin; // 白色由红绿蓝混合
                break;
            default:
                basic.showString("ERR");
                return;
        }

        let steps = 50; // 呼吸灯渐变步数
        let stepDelay = duration / (steps * 2); // 每步延时

        // 渐亮
        for (let i = 0; i <= steps; i++) {
            let brightness = Math.map(i, 0, steps, 0, 1023);
            if (color == LEDColor.Yellow) {
                pins.analogWritePin(TripleRedPin, brightness);
                pins.analogWritePin(TripleGreenPin, brightness);
            } else if (color == LEDColor.Purple) {
                pins.analogWritePin(TripleRedPin, brightness);
                pins.analogWritePin(TripleBluePin, brightness);
            } else if (color == LEDColor.Cyan) {
                pins.analogWritePin(TripleGreenPin, brightness);
                pins.analogWritePin(TripleBluePin, brightness);
            } else if (color == LEDColor.White) {
                pins.analogWritePin(TripleRedPin, brightness);
                pins.analogWritePin(TripleGreenPin, brightness);
                pins.analogWritePin(TripleBluePin, brightness);
            } else {
                pins.analogWritePin(pin, brightness);
            }
            basic.pause(stepDelay);
        }

        // 渐灭
        for (let i = steps; i >= 0; i--) {
            let brightness = Math.map(i, 0, steps, 0, 1023);
            if (color == LEDColor.Yellow) {
                pins.analogWritePin(TripleRedPin, brightness);
                pins.analogWritePin(TripleGreenPin, brightness);
            }
            else if (color == LEDColor.Purple) {
                pins.analogWritePin(TripleRedPin, brightness);
                pins.analogWritePin(TripleBluePin, brightness);
            }
            else if (color == LEDColor.Cyan) {
                pins.analogWritePin(TripleGreenPin, brightness);
                pins.analogWritePin(TripleBluePin, brightness);
            }
            else if (color == LEDColor.White) {
                pins.analogWritePin(TripleRedPin, brightness);
                pins.analogWritePin(TripleGreenPin, brightness);
                pins.analogWritePin(TripleBluePin, brightness);
            }
            else {
                pins.analogWritePin(pin, brightness);
            }
            basic.pause(stepDelay);
        }
        // 确保LED关闭
        pins.analogWritePin(TripleRedPin, 0);
        pins.analogWritePin(TripleGreenPin, 0);
        pins.analogWritePin(TripleBluePin, 0);
    }

    /**
     * 七彩渐变呼吸灯
     * @param duration 呼吸周期时间(ms), eg: 2000
     * */
    //% block="七彩LED 七彩渐变呼吸灯|周期时间(ms) $duration"
    //% blockId="breathe_rainbow_rgb_led"
    //% duration.min=500 duration.max=10000 duration.defl=2000
    //% group="七彩LED"
    //% weight=60
    export function breatheRainbowRgbLed(duration: number): void {
        if(!RgbLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }
        let steps = 50; // 每种颜色渐变步数
        let colors = [
            [255, 0, 0],    // 红色
            [255, 127, 0],  // 橙色
            [255, 255, 0],  // 黄色
            [0, 255, 0],    // 绿色
            [0, 0, 255],    // 蓝色
            [75, 0, 130],   // 靛蓝
            [148, 0, 211]   // 紫色
        ];
        let stepDelay = duration / (steps * colors.length); // 每步延时

        for (let c = 0; c < colors.length; c++) {
            let nextColor = colors[(c + 1) % colors.length];
            for (let i = 0; i <= steps; i++) {
                let red = Math.map(i, 0, steps, colors[c][0], nextColor[0]);
                let green = Math.map(i, 0, steps, colors[c][1], nextColor[1]);
                let blue = Math.map(i, 0, steps, colors[c][2], nextColor[2]);
                setRgbColor(red, green, blue);
                basic.pause(stepDelay);
            }
        }
        // 确保LED关闭
        pins.analogWritePin(TripleRedPin, 0);
        pins.analogWritePin(TripleGreenPin, 0);
        pins.analogWritePin(TripleBluePin, 0);
    }

    /**
     * 初始化按键检测
     * @param pin 按键引脚, eg: DigitalPin.P0
     * @param longPressTime 长按时间(ms), eg: 1000
     * @param debounceTime 防抖时间(ms), eg: 50
     */
    //% block="初始化按键|引脚 $pin|长按时间 $longPressTime ms|防抖时间 $debounceTime ms"
    //% blockId="init_button"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% longPressTime.min=500 longPressTime.max=5000 longPressTime.defl=1000
    //% debounceTime.min=10 debounceTime.max=200 debounceTime.defl=50
    //% group="轻触按键"
    //% weight=90
    export function initButton(pin: DigitalPin, longPressTime: number, debounceTime: number): void {
        // 设置上拉电阻
        pins.setPull(pin, PinPullMode.PullUp);
        scanInterval = debounceTime; // 设置扫描间隔为防抖时间
        // 初始化按键管理器
        buttonManagers[pin] = {
            pin: pin,
            currentState: ButtonState.Idle,
            lastState: ButtonState.Idle,
            pressStartTime: 0,
            longPressTime: longPressTime,
            debounceTime: debounceTime,
            lastDebounceTime: 0,
            isPressed: false,
            wasLongPressed: false
        };

        // 启动按键扫描（只启动一次）
        if (!isRunning) {
            startButtonScanning();
            isRunning = true;
        }
    }

    /**
     * 检测按键事件
     * @param pin 按键引脚, eg: DigitalPin.P0
     * @param event 检测事件, eg: ButtonEvent.Pressed
     */
    //% block="按键 $pin $event"
    //% blockId="check_button_event"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% group="轻触按键"
    //% weight=80
    export function checkButtonEvent(pin: DigitalPin, event: ButtonEvent): boolean {
        if (!buttonManagers[pin]) {
            basic.showString("INIT BTN FIRST!");
            return false;
        }

        const manager = buttonManagers[pin];
        switch (event) {
            case ButtonEvent.Pressed:
                return (manager.currentState === ButtonState.Pressed);
            case ButtonEvent.Released:
                return (manager.currentState === ButtonState.Released);
            case ButtonEvent.LongPressed:
                return (manager.currentState === ButtonState.LongPressed );
            case ButtonEvent.LongReleased:
                return (manager.currentState === ButtonState.LongReleased);
            default:
                return false;
        }
    }

    /**
     * 获取按键当前状态
     * @param pin 按键引脚, eg: DigitalPin.P0
     */
    //% block="按键 $pin 当前状态"
    //% blockId="get_button_state"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% group="轻触按键"
    //% weight=70
    export function getButtonState(pin: DigitalPin): string {
        if (!buttonManagers[pin]) return "Unknown";
        const manager = buttonManagers[pin];
        switch (manager.currentState) {
            case ButtonState.Idle:
                return "Idle";
            case ButtonState.Released:
                return "Released";
            case ButtonState.Pressed:
                return "Pressed";
            case ButtonState.LongPressed:
                return "LongPressed";
            case ButtonState.LongReleased:
                return "LongReleased";
            default:
                return "Unknown";
        }
    }

    /**
     * 重置按键状态
     * @param pin 按键引脚, eg: DigitalPin.P0
     */
    //% block="重置按键 $pin 状态"
    //% blockId="reset_button"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% group="轻触按键"
    //% weight=60
    export function resetButton(pin: DigitalPin): void {
        if (!buttonManagers[pin]) return;
        
        const manager = buttonManagers[pin];
        manager.currentState = ButtonState.Idle
        manager.lastState = ButtonState.Idle
        manager.pressStartTime = 0;
        manager.isPressed = false;
        manager.wasLongPressed = false;
    }

    /**
     * 按键扫描函数（内部使用）
     */
    function startButtonScanning(): void {
        control.inBackground(() => {
            while (true) {
                // 获取当前时间
                const currentTime = input.runningTime();
                // 扫描所有已初始化的按键(不用for...in, 以防止性能问题)
                Object.keys(buttonManagers).forEach(pin => {
                    const manager = buttonManagers[parseInt(pin)];
                    const reading = pins.digitalReadPin(manager.pin);
                    const isPressed = (reading === 0); // 按键按下时引脚为低电平

                    // 如果状态改变，重置防抖计时
                    if (isPressed !== manager.isPressed) {
                        manager.lastDebounceTime = currentTime;
                        manager.isPressed = isPressed;
                    }
                    // 如果经过防抖时间，状态仍然改变，则更新状态
                    if ((currentTime - manager.lastDebounceTime) > manager.debounceTime) {
                        if (manager.isPressed) {
                            // 按键按下
                            if (manager.currentState !== ButtonState.Pressed && manager.currentState !== ButtonState.LongPressed) {
                                manager.currentState = ButtonState.Pressed;
                                manager.pressStartTime = currentTime;
                                manager.wasLongPressed = false;
                            } else if (!manager.wasLongPressed && (currentTime - manager.pressStartTime) >= manager.longPressTime) {
                                // 长按检测
                                manager.currentState = ButtonState.LongPressed;
                                manager.wasLongPressed = true;
                            }
                        } else {
                            // 按键弹起
                            if (manager.currentState === ButtonState.Pressed) {
                                manager.currentState = ButtonState.Released;
                            } else if (manager.currentState === ButtonState.LongPressed) {
                                manager.currentState = ButtonState.LongReleased;
                            } else {
                                manager.currentState = ButtonState.Idle;
                            }
                        }
                    }
                });
                basic.pause(scanInterval); // 扫描间隔
            }   
        });
    }

    /**
     * 等待按键事件发生
     * @param pin 按键引脚, eg: DigitalPin.P0
     * @param event 等待的事件, eg: ButtonEvent.Pressed
     */
    //% block="等待按键 $pin $event"
    //% blockId="wait_button_event"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% group="轻触按键"
    //% weight=50
    export function waitButtonEvent(pin: DigitalPin, event: ButtonEvent): void {
        if (!buttonManagers[pin]) {
            basic.showString("INIT BTN FIRST!");
            return;
        }
        
        while (!checkButtonEvent(pin, event)) {
            basic.pause(10);
        }
    }

    /**
     * 读取倾斜传感器状态（卡尔曼滤波）
     * @param pin 倾斜传感器引脚, eg: DigitalPin.P0
     */
    //% block="倾斜传感器 $pin 被触发"
    //% blockId="read_tilt_sensor"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% group="倾斜传感器"
    //% weight=100
    export function readTiltSensor(pin: DigitalPin): boolean {
        // 设置上拉电阻
        pins.setPull(pin, PinPullMode.PullUp);
        let readings: number[] = [];
        const sampleCount = 5; // 采样次数

        for (let i = 0; i < sampleCount; i++) {
            readings.push(pins.digitalReadPin(pin));
            basic.pause(10); // 采样间隔
        }

        // 计算平均值
        let sum = readings.reduce((a, b) => a + b, 0);
        let average = sum / sampleCount;

        // 如果平均值低于阈值，则认为传感器被触发
        return average < 0.5; // 阈值设为0.5
    }

    /**
     * 振动传感器是否发生振动
     * @param pin 振动传感器引脚, eg: DigitalPin.P0
     */
    //% block="振动传感器 $pin 振动被触发"
    //% blockId="read_vibration_sensor"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% group="振动传感器"
    //% weight=90
    export function readVibrationSensor(pin: DigitalPin): boolean {
        // 设置上拉电阻
        pins.setPull(pin, PinPullMode.PullUp);
        let vibrationCount = 0;
        let threshold = 20 // 振动阈值
        const sampleCount = 20; // 采样次数

        for (let i = 0; i < sampleCount; i++) {
            let reading = pins.digitalReadPin(pin);
            if (reading === 0) { // 振动时引脚为低电平
                vibrationCount++;
            }
            basic.pause(10); // 采样间隔
        }

        return vibrationCount < threshold;
    }

    /**
     * 干簧管传感器是否被触发(无滤波)
     * @param pin 干簧管传感器引脚, eg: DigitalPin.P0
     */
    //% block="干簧管传感器 $pin 被触发"
    //% blockId="read_reed_switch_sensor"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% group="干簧管传感器"
    //% weight=80
    export function readReedSwitchSensor(pin: DigitalPin): boolean {
        // 设置上拉电阻
        pins.setPull(pin, PinPullMode.PullUp);
        let reading = pins.digitalReadPin(pin);
        return reading === 0; // 被触发时引脚为低电平
    }

}
