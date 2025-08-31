//% weight=100 color=#0fbc11 icon="\uf0eb"
namespace myLed {
    /**
     * 点亮一个 LED 灯
     * @param x LED 的 X 坐标，范围 0~4 eg: 2
     * @param y LED 的 Y 坐标，范围 0~4 eg: 2
     */
    //% blockId=myLed_plot block="点亮LED x %x y %y"
    //% x.min=0 x.max=4 y.min=0 y.max=4
    export function plot(x: number, y: number): void {
        led.plot(x, y)
    }
}
