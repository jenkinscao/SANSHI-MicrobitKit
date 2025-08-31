//% weight=100 color=#e67e22 icon="\uf0eb"
namespace dualLed {
    // 默认端口
    let redPin: DigitalPin = DigitalPin.P0
    let greenPin: DigitalPin = DigitalPin.P1

    /**
     * 设置双色LED端口
     * 参数使用 DigitalPin 类型，编辑器显示表格下拉
     * @param red 红灯端口
     * @param green 绿灯端口
     */
    //% blockId=dualLed_setup block="设置双色LED 红灯 %red 绿灯 %green"
    //% red.defl=DigitalPin.P0 green.defl=DigitalPin.P1
    //% inlineInputMode=inline
    export function setup(red: DigitalPin, green: DigitalPin): void {
        redPin = red
        greenPin = green
        pins.digitalWritePin(redPin, 0)
        pins.digitalWritePin(greenPin, 0)
    }

    /**
     * 点亮红灯
     */
    //% blockId=dualLed_red block="点亮红灯"
    export function red(): void {
        pins.digitalWritePin(redPin, 1)
        pins.digitalWritePin(greenPin, 0)
    }

    /**
     * 点亮绿灯
     */
    //% blockId=dualLed_green block="点亮绿灯"
    export function green(): void {
        pins.digitalWritePin(redPin, 0)
        pins.digitalWritePin(greenPin, 1)
    }

    /**
     * 熄灭双色LED
     */
    //% blockId=dualLed_off block="熄灭双色LED"
    export function off(): void {
        pins.digitalWritePin(redPin, 0)
        pins.digitalWritePin(greenPin, 0)
    }
}
