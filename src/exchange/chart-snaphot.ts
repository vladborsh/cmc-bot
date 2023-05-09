import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import { format } from 'date-fns';
import { CandlestickChartData } from '../interfaces/charts/candlestick-chart-data';
import { PlotShape } from '../interfaces/charts/plot-shape.interface';
import { Plot } from '../interfaces/charts/plot.interface';

export class ChartSnapshot {
  canvasWidth = 800;
  canvasHeight = 600;
  candleWidth = 6;
  padding = 2;
  scalePaddingLeft = 10;
  scaleWidth = 50;
  scaleHeight = this.canvasHeight - 20;
  scaleStep = 10;

  /**
   * @param candles
   * @param plotshapes - arrayOfOpenTime where to draw shape (for markup purposes)
   * @returns
   */
  generateImage(candles: CandlestickChartData[], plotShapes?: PlotShape[], plots?: Plot[]): Buffer {
    const canvas = createCanvas(this.canvasWidth, this.canvasHeight);
    const ctx = canvas.getContext('2d');

    const maxPrice = Math.max(...candles.map((kline: CandlestickChartData) => kline.high));
    const minPrice = Math.min(...candles.map((kline: CandlestickChartData) => kline.low));
    const priceRange = maxPrice - minPrice;
    const priceStep = priceRange / this.scaleStep;

    candles.forEach((kline: CandlestickChartData, index: number) => {
      this.renderCandle(kline, index, priceRange, minPrice, ctx);
      if (plotShapes) {
        plotShapes.forEach(plotShape => {
          if (plotShape.values[index]) {
            this.renderSimpleShape(kline, index, priceRange, minPrice, plotShape.color, ctx);
          }
        })
      }
    });

    if (plots) {
      plots.forEach(plot => {
        this.renderPlot(candles.length - plot.values.length, plot.values, priceRange, minPrice, plot.color, ctx);
      })
    }

    this.renderPriceScale(maxPrice, priceStep, ctx);
    this.renderDatetimeLabels(candles, candles.length, ctx);

    return canvas.toBuffer('image/png');
  }

  private renderPlot(
    shift: number,
    plot: number[],
    priceRange: number,
    minPrice: number,
    color: string,
    ctx: CanvasRenderingContext2D
  ) {
    ctx.strokeStyle = color;
    ctx.beginPath();

    for (let i = shift; i < plot.length + shift; i++) {
      const x = this.candleWidth*shift + i * (this.candleWidth + this.padding);
      const y = (1 - (plot[i] - minPrice) / priceRange) * this.canvasHeight;
      if (i === shift) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  private renderSimpleShape(
    kline: CandlestickChartData,
    index: number,
    priceRange: number,
    minPrice: number,
    color: string,
    ctx: CanvasRenderingContext2D
  ) {
    const high = kline.high;
    const distanceFromCandle = 10;

    const x = index * (this.candleWidth + this.padding);
    const y = (1 - (high - minPrice) / priceRange) * this.canvasHeight - distanceFromCandle;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, this.candleWidth, this.candleWidth);
  }

  private renderCandle(
    kline: CandlestickChartData,
    index: number,
    priceRange: number,
    minPrice: number,
    ctx: CanvasRenderingContext2D
  ) {
    const open = kline.open;
    const close = kline.close;
    const high = kline.high;
    const low = kline.low;

    const x = index * (this.candleWidth + this.padding);
    const bodyHeight = (Math.abs(open - close) / priceRange) * this.canvasHeight;
    const wickHeight = ((high - low) / priceRange) * this.canvasHeight;

    const color = close >= open ? 'green' : 'red';

    // draw body
    const bodyY =
      close >= open
        ? (1 - (close - minPrice) / priceRange) * this.canvasHeight
        : (1 - (open - minPrice) / priceRange) * this.canvasHeight;
    ctx.fillStyle = color;
    ctx.fillRect(x, bodyY, this.candleWidth, bodyHeight);

    // draw wick
    const wickY = (1 - (high - minPrice) / priceRange) * this.canvasHeight;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + this.candleWidth / 2, wickY);
    ctx.lineTo(x + this.candleWidth / 2, wickY + wickHeight);
    ctx.stroke();
  }

  private renderPriceScale(maxPrice: number, priceStep: number, ctx: CanvasRenderingContext2D) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= this.scaleStep; i++) {
      const price = maxPrice - i * priceStep;
      const y = (i / this.scaleStep) * this.scaleHeight + 10;
      ctx.fillText(price.toFixed(2), this.scalePaddingLeft + this.scaleWidth, y);
    }
  }

  private renderDatetimeLabels(
    candles: CandlestickChartData[],
    limit: number,
    ctx: CanvasRenderingContext2D
  ) {
    const labelStep = Math.ceil(limit / 5); // value to control the number of labels displayed

    candles.forEach((kline: CandlestickChartData, index: number) => {
      if (index % labelStep === 0) {
        const timestamp = kline.openTime;
        const date = new Date(timestamp);
        const formattedDate = format(date, 'MMM dd hh:mm');
        const x =
          this.scalePaddingLeft +
          this.scaleWidth +
          index * (this.candleWidth + this.padding) +
          this.candleWidth / 2;
        ctx.fillText(formattedDate, x, this.canvasHeight - 20);
      }
    });
  }
}
