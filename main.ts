enum LEDDualColor {
    //% block="红色"
    Red,
    //% block="绿色" 
    Green
}

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

//HW-504遥感器方向
enum HW504DirectionEvent {
    //% block="中间"
    Center,
    //% block="上"
    Up,
    //% block="下"
    Down,
    //% block="左"
    Left,
    //% block="右"
    Right,
    //% block="上左"
    UpLeft,
    //% block="上右"
    UpRight,
    //% block="下左"
    DownLeft,
    //% block="下右"
    DownRight
}

enum SoilMoistureEvent {
    //% block="干燥"
    Dry,
    //% block="湿润"
    Wet
}

//% groups=["双色LED", "七彩LED", "轻触按键", "倾斜传感器", "振动传感器"，"干簧管传感器", "有源蜂鸣器", "U型光电传感器", "TM1637四位数码管", "HW-504双轴遥感器", "土壤温湿度传感器"]
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

    let HW504_XPin: AnalogPin;
    let HW504_YPin: AnalogPin;
    let HW504_Initialized: boolean = false;
    let HW504_SWPin: DigitalPin;
    let HW504_SwitchInitialized: boolean = false;

    let SoilMoisture_AnalogPin: AnalogPin;
    let SoilMoisture_DigitalPin: DigitalPin;
    let SoilMoisture_Initialized: boolean = false;

    let TM1637_CMD1 = 0x40;
    let TM1637_CMD2 = 0xC0;
    let TM1637_CMD3 = 0x80;
    let _SEGMENTS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71];

    /**
     * 初始化TM1637四位数码管
     */
    //% group="TM1637四位数码管"
    //% weight=100
    export class TM1637Leds{
        buf: Buffer;
        clk: DigitalPin;
        dio: DigitalPin;
        _ON: number;
        brightness: number;
        count: number;

        /**
         * 初始化TM1637四位数码管
         */
         init():void{
            pins.digitalWritePin(this.clk, 0);
            pins.digitalWritePin(this.dio, 0);
            this._ON = 8;
            this.buf = pins.createBuffer(this.count);
            this.clear();
         } 

         _start():void{
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 0);
         }

         _stop():void{
            pins.digitalWritePin(this.dio, 0);
            pins.digitalWritePin(this.clk, 1);
            pins.digitalWritePin(this.dio, 1);
         }

         _write_data_cmd():void{
            this._start();
            this._write_byte(TM1637_CMD1);
            this._stop();
         }

         _write_dsp_ctrl():void{
            this._start();
            this._write_byte(TM1637_CMD3 | this._ON | this.brightness);
            this._stop();
         }

         _write_byte(b: number):void{
            for(let i = 0; i < 8; i++){
                pins.digitalWritePin(this.dio, (b >> i) & 0x01);
                pins.digitalWritePin(this.clk, 1);
                pins.digitalWritePin(this.clk, 0);
            }
            pins.digitalWritePin(this.clk, 1);
            pins.digitalWritePin(this.clk, 0);
         }

         /**
          * 设置tm1637数码管亮度，范围0-8，0最暗，8最亮
          * @param brightness 亮度, eg: 7
          */
        //% block="%TM1637亮度|设置亮度为 %brightness"
        //% blockId="tm1637_set_brightness"
        //% brightness.min=0 brightness.max=8 brightness.defl=7
        //% group="TM1637四位数码管"
        //% weight=90
        setBrightness(brightness: number): void {
            if(brightness < 0)
            {
                this.off();
                return;
            }
            if(brightness > 8) brightness = 8;
            this._ON = 8;
            this.brightness = brightness - 1;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        _dat(bit:number, dat:number){
            this._write_data_cmd();
            this._start();
            this._write_byte(TM1637_CMD2 | (bit % this.count));
            this._write_byte(dat);
            this._stop();
            this._write_dsp_ctrl();
        }

        /**
         * 在指定位置显示一个数字或字符
         * @param bit 位置, eg: 0
         * @param data 显示的数字或字符, eg: 0
         */
        //% block="%TM1637数码管|在位置 %bit 显示 %data"
        //% blockId="tm1637_show_data"
        //% bit.min=0 bit.max=3 bit.defl=0
        //% data.min=0 data.max=15 data.defl=0
        //% group="TM1637四位数码管"
        //% weight=80
        showbit(bit: number, data: number): void {
            this.buf[bit % this.count] = _SEGMENTS[data % 16];
            this._dat(bit, _SEGMENTS[data % 16]);
        }

        /**
         * 显示一个数字(前导0可选择显示或不显示)
         * @param num 要显示的数字, eg: 1234
         * @param leadingZero 是否显示前导0, eg: false
         */
        //% block="%TM1637数码管|显示数字 %num |前导0 %leadingZero"
        //% blockId="tm1637_show_number"
        //% num.min=-999 num.max=9999 num.defl=1234
        //% leadingZero.shadow="toggleOnOff" leadingZero.defl=false
        //% group="TM1637四位数码管"
        //% weight=70
        showNumber(num: number, leadingZero: boolean): void {
            if(num < 0){
                this._dat(0, 0x40);
                num = -num;
            }
            else{
                if(leadingZero) this.showbit(0, Math.idiv(num, 1000) % 10);
                else{
                    if(num >= 1000) this.showbit(0, Math.idiv(num, 1000) % 10);
                    else this._dat(0, 0);
                }
            }
            if(leadingZero) this.showbit(1, Math.idiv(num, 100) % 10);
            else{
                if(num >= 100) this.showbit(1, Math.idiv(num, 100) % 10);
                else this._dat(1, 0);
            }
            if(leadingZero) this.showbit(2, Math.idiv(num, 10) % 10);
            else{
                if(num >= 10) this.showbit(2, Math.idiv(num, 10) % 10);
                else this._dat(2, 0);
            }
            this.showbit(3, num % 10);
        }

        /**
         * 显示一个16进制数字(前导0可选择显示或不显示)
         * @param num 要显示的16进制数字, eg: 0x1A3F
         * @param leadingZero 是否显示前导0, eg: false
         */
        //% block="%TM1637数码管|显示16进制数字 %num |前导0 %leadingZero"
        //% blockId="tm1637_show_hex"
        //% num.min=-0xFFF num.max=0xFFFF num.defl=0x1A3F
        //% leadingZero.shadow="toggleOnOff" leadingZero.defl=false
        //% group="TM1637四位数码管"
        //% weight=65
        showHex(num: number, leadingZero: boolean): void {
            if(num < 0){
                this._dat(0, 0x40);
                num = -num;
            }
            else{
                if(leadingZero) this.showbit(0, (num >> 12) & 0x0F);
                else{
                    if(num >= 0x1000) this.showbit(0, (num >> 12) & 0x0F);
                    else this._dat(0, 0);
                }
            }
            if(leadingZero) this.showbit(1, (num >> 8) & 0x0F);
            else{
                if(num >= 0x100) this.showbit(1, (num >> 8) & 0x0F);
                else this._dat(1, 0);
            }
            if(leadingZero) this.showbit(2, (num >> 4) & 0x0F);
            else{
                if(num >= 0x10) this.showbit(2, (num >> 4) & 0x0F);
                else this._dat(2, 0);
            }
            this.showbit(3, num & 0x0F);
        }


        /**
         * 显示一个字符串
         * @param str 要显示的字符串, eg: "1234"
         * */
        //% block="%TM1637数码管|显示字符串 %str"
        //% blockId="tm1637_show_string"
        //% str.defl="1234"
        //% group="TM1637四位数码管"
        //% weight=60
        showString(str: string): void {
            let len = str.length;
            if(len > this.count) len = this.count;
            for(let i = 0; i < len; i++){
                let c = str.charCodeAt(i);
                if(c >= 48 && c <= 57){
                    this.buf[i] = _SEGMENTS[c - 48];
                }
                else if(c >= 65 && c <= 70){
                    this.buf[i] = _SEGMENTS[c - 55];
                }
                else if(c >= 97 && c <= 102){
                    this.buf[i] = _SEGMENTS[c - 87];
                }
                else{
                    this.buf[i] = 0;
                }
                this._dat(i, this.buf[i]);
            }
        }




        /**
         * 显示或清除冒号
         * @param on 是否显示, eg: true
         */
        //% block="%TM1637数码管| 显示冒号 %on"
        //% blockId="tm1637_show_dot"
        //% on.shadow="toggleOnOff" on.defl=true
        //% group="TM1637四位数码管"
        //% weight=50
        showDP(on: boolean): void {
            if(on){
                this._dat(1, this.buf[1] | 0x80);
            }
            else{
                this._dat(1, this.buf[1] & 0x7F);
            }
        }

        /**
         * 关闭数码管显示
         */
        //% block="%TM1637数码管|关闭显示"
        //% blockId="tm1637_off"
        //% group="TM1637四位数码管"
        //% weight=10
        clear(): void {
            for(let i = 0; i < this.count; i++){
                this._dat(i, 0);
                this.buf[i] = 0;
            }
        }

        /**
         * 开启LED显示
         */
        //% block="%TM1637数码管|开启LED显示"
        //% blockId="tm1637_on"
        //% group="TM1637四位数码管"
        //% weight=30
        on(): void {
            this._ON = 8;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

        /**
         * 关闭LED显示
         * */
        //% block="%TM1637数码管|关闭LED显示"
        //% blockId="tm1637_off_display"
        //% group="TM1637四位数码管"
        //% weight=20
        off(): void {
            this._ON = 0;
            this._write_data_cmd();
            this._write_dsp_ctrl();
        }

    }


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
     * @param color 选择颜色, eg: LEDDualColor.Red
     * @param state LED状态, eg: true
     */
    //% block="双色LED颜色为 $color 灯 $state"
    //% blockId="set_dual_color_led"
    //% state.shadow="toggleOnOff"
    //% state.defl=true
    //% group="双色LED"
    //% weight=90
    export function setDualColorLed(color: LEDDualColor, state: boolean): void {
        if(!DualLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }

        if (color == LEDDualColor.Red) {
            pins.digitalWritePin(DualRedPin, state ? 1 : 0);
            pins.digitalWritePin(DualGreenPin, 0); // 关闭绿色
        } else if (color == LEDDualColor.Green) {
            pins.digitalWritePin(DualGreenPin, state ? 1 : 0);
            pins.digitalWritePin(DualRedPin, 0); // 关闭红色
        }
    }

   /**
    * 单个引脚LED持续时间闪烁
    * @param color 选择颜色, eg: LEDDualColor.Red
    * @param times 闪烁次数, eg: 1
    * @param interval 闪烁间隔时间(ms), eg: 200
    */
    //% block="双色LED颜色为 $color 灯|闪烁次数 $times | 间隔时间(ms) $interval"
    //% blockId="blink_dual_color_led"
    //% times.min=1 times.max=20 times.defl=1
    //% interval.min=50 interval.max=2000 interval.defl=200
    //% group="双色LED"
    //% weight=80
    export function blinkDualColorLed(color: LEDDualColor, times: number, interval: number): void {
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
    export function blinkBothColorLed(color: LEDDualColor, times: number, interval: number): void {
        if(!DualLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }
        let firstColor = color;
        let secondColor = (color == LEDDualColor.Red) ? LEDDualColor.Green : LEDDualColor.Red;

        for (let i = 0; i < times; i++) {
            if(firstColor == LEDDualColor.Red) {
                pins.digitalWritePin(DualGreenPin, 0); // 关闭绿色
                pins.digitalWritePin(DualRedPin, 1); // 打开红色
            }else {
                pins.digitalWritePin(DualRedPin, 0); // 关闭红色
                pins.digitalWritePin(DualGreenPin, 1); // 打开绿色
            }
            basic.pause(interval);
            if(secondColor == LEDDualColor.Green) {
                pins.digitalWritePin(DualRedPin, 0); // 关闭红色
                pins.digitalWritePin(DualGreenPin, 1); // 打开绿色
            }else {
                pins.digitalWritePin(DualGreenPin, 0); // 关闭绿色
                pins.digitalWritePin(DualRedPin, 1); // 打开红色
            }
            basic.pause(interval);
        }
        // 结束后关闭所有LED
        setDualColorLed(LEDDualColor.Red, false);   
    }

    /**
     * 双色LED呼吸灯
     * @param color 选择颜色, eg: LEDDualColor.Red
     * @param duration 呼吸周期时间(ms), eg: 2000
     * */
    //% block="双色LED颜色为 $color 呼吸灯|周期时间(ms) $duration"
    //% blockId="breathe_dual_color_led"
    //% duration.min=500 duration.max=10000 duration.defl=2000
    //% group="双色LED"
    //% weight=60
    export function breatheDualColorLed(color: LEDDualColor, duration: number): void {
        if(!DualLedInitialized) {
            basic.showString("NOT INIT LED!");
            return;
        }
        let pin = (color == LEDDualColor.Red) ? DualRedPin : DualGreenPin;
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

    /**
     * 有源蜂鸣器发声
     * @param pin 蜂鸣器引脚, eg: DigitalPin.P0
     * @param state 发声状态, eg: true
     */
    //% block="有源蜂鸣器 $pin 发声 $state"
    //% blockId="buzzer_sound"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% state.shadow="toggleOnOff"
    //% state.defl=true
    //% group="有源蜂鸣器"
    //% weight=100
    export function buzzerSound(pin: DigitalPin, state: boolean): void {
        if (!state) {
            pins.digitalWritePin(pin, 1); // 发声
        } else {
            pins.digitalWritePin(pin, 0); // 停止发声
        }
    }

    /**
     * U型光电传感器是否被触发
     * @param pin U型光电传感器引脚, eg: DigitalPin.P0
     */
    //% block="U型光电传感器 $pin 被触发"
    //% blockId="read_photoelectric_sensor"
    //% pin.fieldEditor="gridpicker" pin.fieldOptions.columns=4
    //% group="U型光电传感器"
    //% weight=90
    export function readPhotoelectricSensor(pin: DigitalPin): boolean {
        // 设置上拉电阻
        pins.setPull(pin, PinPullMode.PullUp);
        let reading = pins.digitalReadPin(pin);
        return !!reading; // 被触发时引脚为低电平
    }

    /**
     * 创建TM1637数码管对象
     * @param clkPin CLK引脚, eg: DigitalPin.P0
     * @param dioPin DIO引脚, eg: DigitalPin.P1
     * @param brightness 亮度(0-7), eg: 7
     * @param count LED位数(1-4), eg: 4
     */
    //% block="创建TM1637数码管|CLK引脚 %clkPin| DIO引脚 %dioPin| 亮度 %brightness| LED位数 %count"
    //% blockId="create_tm1637_display"
    //% clkPin.fieldEditor="gridpicker" clkPin.fieldOptions.columns=4
    //% dioPin.fieldEditor="gridpicker" dioPin.fieldOptions.columns=4
    //% brightness.min=0 brightness.max=7 brightness.defl=7
    //% count.min=1 count.max=4 count.defl=4
    //% blockSetVariable=TM1637
    //% group="TM1637四位数码管"
    //% weight=110
    export function createTm1637Display(clkPin: DigitalPin, dioPin: DigitalPin, brightness: number, count: number): TM1637Leds{
        let display = new TM1637Leds();
        display.clk = clkPin;
        display.dio = dioPin;
        if(count < 1 || count > 4) {
            count = 4; // 默认4位数码管
        }
        display.count = count;
        display.brightness = brightness;
        display.init();
        return display;
    }

    /**
     * 创建HW-504双轴遥感器对象
     * @param xPin X轴引脚, eg: AnalogPin.P0
     * @param yPin Y轴引脚, eg: AnalogPin.P1
     * @param SW 按键引脚, eg: DigitalPin.P2 
     */
    //% block="创建HW-504双轴遥感器|X轴引脚 %xPin|Y轴引脚 %yPin|按键引脚 %SW"
    //% blockId="create_hw504_joystick"
    //% xPin.fieldEditor="gridpicker" xPin.fieldOptions.columns=4
    //% yPin.fieldEditor="gridpicker" yPin.fieldOptions.columns=4
    //% SW.fieldEditor="gridpicker" SW.fieldOptions.columns=4
    //% group="HW-504双轴遥感器"
    //% weight=100
    export function createHW504Joystick(xPin: AnalogPin, yPin: AnalogPin, SW: DigitalPin): void {

        HW504_XPin = xPin;
        HW504_YPin = yPin;
        HW504_SWPin = SW;
        // 设置按键引脚上拉电阻
        pins.setPull(HW504_SWPin, PinPullMode.PullUp);
        HW504_Initialized = true;
        HW504_SwitchInitialized = true;
    }

    /**
     * 获取HW-504双轴遥感器的X轴值
     */
    //% block="获取HW-504双轴遥感器X轴值"
    //% blockId="get_hw504_x_axis"
    //% group="HW-504双轴遥感器"
    //% weight=80
    export function getHW504XAxis(): number {
        if (!HW504_Initialized) {
            return 0;
        }
        return pins.analogReadPin(HW504_XPin);
    }

    /**
     * 获取HW-504双轴遥感器的Y轴值
     */
    //% block="获取HW-504双轴遥感器Y轴值"
    //% blockId="get_hw504_y_axis"
    //% group="HW-504双轴遥感器"
    //% weight=80
    export function getHW504YAxis(): number {
        if (!HW504_Initialized) {
            return 0;
        }
        return pins.analogReadPin(HW504_YPin);
    }

    /**
     * HW-504双轴遥感器按下状态
     */
    //% block="HW-504双轴遥感器按键被按下"
    //% blockId="check_hw504_switch_pressed"
    //% group="HW-504双轴遥感器"
    //% weight=70
    export function checkHW504SwitchPressed(): boolean {
        if (!HW504_SwitchInitialized) {
            return false;
        }
        return pins.digitalReadPin(HW504_SWPin) === 0;
    }

    /**
     * 判断HW-504双轴遥感器的方向状态
     * @param direction 方向枚举, eg: JoystickDirection.Up
     * */
    //% block="HW-504双轴遥感器|方向 $direction 被触发"
    //% blockId="check_hw504_direction"
    //% group="HW-504双轴遥感器"
    //% weight=80
    export function checkHW504Direction(direction: HW504DirectionEvent): boolean {
        if (!HW504_Initialized) {
            return false;
        }
        switch (direction) {
            case HW504DirectionEvent.Up:
                return getHW504XAxis() >= 500 && getHW504XAxis() <= 520 && getHW504YAxis() < 100;
            case HW504DirectionEvent.Down:
                return getHW504YAxis() > 900 && getHW504XAxis() >= 500 && getHW504XAxis() <= 520;
            case HW504DirectionEvent.Left:
                return getHW504XAxis() < 100 && getHW504YAxis() >= 490 && getHW504YAxis() <= 510;
            case HW504DirectionEvent.Right:
                return getHW504XAxis() > 900 && getHW504YAxis() >= 490 && getHW504YAxis() <= 510;
            case HW504DirectionEvent.Center:
                return getHW504XAxis() >= 500 && getHW504XAxis() <= 520 &&
                       getHW504YAxis() >= 490 && getHW504YAxis() <= 510;
            case HW504DirectionEvent.UpLeft:
                return getHW504XAxis() < 100 && getHW504YAxis() < 100;
            case HW504DirectionEvent.UpRight:
                return getHW504XAxis() > 900 && getHW504YAxis() < 100;
            case HW504DirectionEvent.DownLeft:
                return getHW504XAxis() < 100 && getHW504YAxis() > 900;
            case HW504DirectionEvent.DownRight:
                return getHW504XAxis() > 900 && getHW504YAxis() > 900;
            default:
                return false;
        }
    }

    /**
     * 土壤湿度传感器初始化
     * @param analogPin 土壤湿度传感器模拟引脚, eg: AnalogPin.P0
     * @param digitalPin 土壤湿度传感器数字引脚, eg: DigitalPin.P1
     */
    //% block="初始化土壤湿度传感器|模拟引脚 %analogPin|数字引脚 %digitalPin"
    //% blockId="init_soil_moisture"
    //% group="土壤温湿度传感器"
    //% weight=100
    export function initSoilMoisture(analogPin: AnalogPin, digitalPin: DigitalPin): void {
        SoilMoisture_AnalogPin = analogPin;
        SoilMoisture_DigitalPin = digitalPin;
        // 设置数字引脚上拉电阻
        pins.setPull(SoilMoisture_DigitalPin, PinPullMode.PullUp);
        SoilMoisture_Initialized = true;
    }

    /**
     * 读取土壤湿度传感器模拟值(0-1023)
     */
    //% block="读取土壤湿度传感器模拟值"
    //% blockId="read_soil_moisture_analog"
    //% group="土壤温湿度传感器"
    //% weight=90
    export function readSoilMoistureAnalog(): number {
        if (!SoilMoisture_Initialized) {
            return -1;
        }
        return pins.analogReadPin(SoilMoisture_AnalogPin);
    }

    /**
     * 判断土壤湿度传感器状态(干燥/湿润)
     * @param state 土壤湿度状态, eg: SoilMoistureState.Wet
     */
    //% block="土壤湿度传感器状态为 $state"
    //% blockId="read_soil_moisture_digital"
    //% group="土壤温湿度传感器"
    //% weight=80
    export function readSoilMoistureDigital(state:SoilMoistureEvent): boolean {

        if (!SoilMoisture_Initialized) {
            return false;
        }
        let reading = pins.digitalReadPin(SoilMoisture_DigitalPin);
        if(state == SoilMoistureEvent.Wet) {
            return reading === 0; // 湿润时引脚为低电平
        } else {
            return reading === 1; // 干燥时引脚为高电平
        }
    }
}
