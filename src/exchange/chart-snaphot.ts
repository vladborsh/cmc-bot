import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import { format } from 'date-fns';
import { CandleChartData } from '../interfaces/charts/candlestick-chart-data';
import { PlotShape, ShapeLocation } from '../interfaces/charts/plot-shape.interface';
import { Plot } from '../interfaces/charts/plot.interface';
import { LineTitleLocation, PlotLine, PlotLineStyle } from '../interfaces/charts/plot-line';
import { VerticalPlotLine } from '../interfaces/charts/vertial-plot-line';
import { HorizontalPlotLine } from '../interfaces/charts/horizontal-plot-line';
import { ChartDrawingsData } from '../indicators/interfaces/sm-indicator-response';

const UP_CANDLE_COLOR = '#57b36a';
const DOWN_CANDLE_COLOR = '#b35764';

export class ChartSnapshot {
  canvasWidth = 1500;
  canvasHeight = 900;
  canvasPadding = 100;
  canvasPaddingRight = 100;
  candleWidth = 4;
  candlePadding = 1;
  scalePaddingLeft = 10;
  scaleWidth = 50;
  scaleHeight = this.canvasHeight - 20;
  scaleStep = 10;
  defaultPlotColor = '#666666';
  shapeDistanceFromCandle = 15;

  /* if number of candles more than canvas can contain, we should start draw candles a bit left from the canvas 0x coordinate */
  backShift = 0;
  /* if number of candles more than canvas can contain, we can render only certain visible candles */
  maxVisibleCandlesNum = (this.canvasWidth - this.canvasPaddingRight) / (this.candleWidth + this.candlePadding);
  visibleNumOfCandles = 0;
  visibleCandlesStartIndex = 0;

  /**
   * @param candles
   * @param plotshapes - arrayOfOpenTime where to draw shape (for markup purposes)
   * @returns
   */
  generateImage(candles: CandleChartData[], chartDrawingsData: ChartDrawingsData): Buffer {
    const canvas = createCanvas(this.canvasWidth, this.canvasHeight);
    const ctx = canvas.getContext('2d');

    this.backShift = Math.min(
      this.canvasWidth - candles.length * (this.candleWidth + this.candlePadding) - this.canvasPaddingRight,
      0
    );
    this.visibleNumOfCandles = Math.min(this.maxVisibleCandlesNum, candles.length);
    this.visibleCandlesStartIndex = candles.length - this.visibleNumOfCandles;

    const maxPrice = Math.max(
      ...candles.slice(this.visibleCandlesStartIndex).map((kline: CandleChartData) => kline.high)
    );
    const minPrice = Math.min(
      ...candles.slice(this.visibleCandlesStartIndex).map((kline: CandleChartData) => kline.low)
    );
    const priceRange = maxPrice - minPrice;
    const priceStep = priceRange / this.scaleStep;

    candles.forEach((kline: CandleChartData, index: number) => {
      this.renderCandle(kline, index, priceRange, minPrice, ctx);
    });

    if (chartDrawingsData.plotShapes) {
      chartDrawingsData.plotShapes.forEach((plotShape) => {
        this.renderSimpleShape(
          candles.length - plotShape.values.length,
          candles,
          plotShape,
          priceRange,
          minPrice,
          ctx
        );
      });
    }

    if (chartDrawingsData.plots) {
      chartDrawingsData.plots.forEach((plot) => {
        this.renderPlot(
          candles.length - plot.values.length,
          plot.values,
          priceRange,
          minPrice,
          plot.color || this.defaultPlotColor,
          ctx
        );
      });
    }

    if (chartDrawingsData.lines) {
      chartDrawingsData.lines.forEach((plotLine) => {
        this.renderPlotLine(plotLine, priceRange, minPrice, ctx);
      });
    }

    if (chartDrawingsData.verticalLines) {
      chartDrawingsData.verticalLines.forEach((line) => this.renderVerticalLine(line, ctx));
    }

    if (chartDrawingsData.horizontalLines) {
      chartDrawingsData.horizontalLines.forEach((line) =>
        this.renderHorizontalLine(line, priceRange, minPrice, ctx)
      );
    }

    this.renderPriceScale(maxPrice, priceStep, ctx);

    this.renderDatetimeLabels(
      candles.slice(this.visibleCandlesStartIndex),
      this.visibleNumOfCandles,
      ctx
    );

    return canvas.toBuffer('image/png');
  }

  private renderPlotLine(
    plotLine: PlotLine,
    priceRange: number,
    minPrice: number,
    ctx: CanvasRenderingContext2D
  ) {
    const x1 = this.backShift + (plotLine.x1 * (this.candleWidth + this.candlePadding));
    const x2 = this.backShift + (plotLine.x2 * (this.candleWidth + this.candlePadding));
    const y1 = this.canvasPadding + (1 - (plotLine.y1 - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding);
    const y2 = this.canvasPadding + (1 - (plotLine.y2 - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding);

    if (plotLine.style === PlotLineStyle.DASHED) {
      ctx.setLineDash([3, 2]);
    } else if (plotLine.style === PlotLineStyle.DOTTED) {
      ctx.setLineDash([1, 1]);
    }
    ctx.strokeStyle = plotLine.color || this.defaultPlotColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    /* Unset line dash */
    ctx.setLineDash([]);

    if (plotLine.title && plotLine.titleLocation) {
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillStyle = plotLine.color || this.defaultPlotColor;
      if (plotLine.titleLocation === LineTitleLocation.LEFT_BOTTOM) {
        ctx.fillText(plotLine.title, x1, y1 + 3);
      } else if (plotLine.titleLocation === LineTitleLocation.LEFT_TOP) {
        ctx.fillText(plotLine.title, x1, y1 - 12);
      }
    }
  }

  private renderVerticalLine(plotLine: VerticalPlotLine, ctx: CanvasRenderingContext2D) {
    const x1 = plotLine.x * (this.candleWidth + this.candlePadding);
    const x2 = plotLine.x * (this.candleWidth + this.candlePadding);
    const y1 = 0;
    const y2 = this.canvasHeight;

    if (plotLine.style === PlotLineStyle.DASHED) {
      ctx.setLineDash([3, 2]);
    } else if (plotLine.style === PlotLineStyle.DOTTED) {
      ctx.setLineDash([1, 1]);
    }
    ctx.strokeStyle = plotLine.color || this.defaultPlotColor;
    ctx.beginPath();
    ctx.moveTo(this.backShift + x1, y1);
    ctx.lineTo(this.backShift + x2, y2);
    ctx.stroke();
    /* Unset line dash */
    ctx.setLineDash([]);

    if (plotLine.title && plotLine.titleLocation) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = plotLine.color || this.defaultPlotColor;
      ctx.save();
      ctx.translate(this.backShift + plotLine.x * (this.candleWidth + this.candlePadding) - 14, 50);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(plotLine.title, 0, 0); // draw the text at the new origin
      ctx.restore();
    }
  }

  private renderHorizontalLine(
    plotLine: HorizontalPlotLine,
    priceRange: number,
    minPrice: number,
    ctx: CanvasRenderingContext2D
  ) {
    const x1 = 0;
    const x2 = this.canvasWidth;
    const y1 = this.canvasPadding + (1 - (plotLine.y - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding);
    const y2 = this.canvasPadding + (1 - (plotLine.y - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding);

    if (plotLine.style === PlotLineStyle.DASHED) {
      ctx.setLineDash([3, 2]);
    } else if (plotLine.style === PlotLineStyle.DOTTED) {
      ctx.setLineDash([1, 1]);
    }

    ctx.strokeStyle = plotLine.color || this.defaultPlotColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    /* Unset line dash */
    ctx.setLineDash([]);

    if (plotLine.title && plotLine.titleLocation) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = plotLine.color || this.defaultPlotColor;
      ctx.fillText(
        plotLine.title,
        this.canvasWidth - 100,
        y1 - 12
      );
    }
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
      const x = i * (this.candleWidth + this.candlePadding);
      const y = (1 - (plot[i - shift] - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding);
      if (i === shift) {
        ctx.moveTo(this.backShift + x, y);
      } else {
        ctx.lineTo(this.backShift + x, y);
      }
    }

    ctx.stroke();
  }

  private renderSimpleShape(
    shift: number,
    candles: CandleChartData[],
    plotShape: PlotShape,
    priceRange: number,
    minPrice: number,
    ctx: CanvasRenderingContext2D
  ) {
    for (let i = shift; i < plotShape.values.length + shift; i++) {
      if (plotShape.values[i - shift]) {
        const high = candles[i].high;
        const low = candles[i].low;

        const x = i * (this.candleWidth + this.candlePadding);
        let y: number;
        if (plotShape.location === ShapeLocation.ABOVE) {
          y =
          this.canvasPadding + (1 - (high - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding) - this.shapeDistanceFromCandle;
        } else {
          const wickHeight = ((high - low) / priceRange) * (this.canvasHeight - this.canvasPadding);
          y =
          this.canvasPadding + (1 - (high - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding) +
            wickHeight +
            this.shapeDistanceFromCandle;
        }
        ctx.fillStyle = plotShape.color || this.defaultPlotColor;
        ctx.fillRect(this.backShift + x, y, this.candleWidth, this.candleWidth);
      }
    }
  }

  private renderCandle(
    kline: CandleChartData,
    index: number,
    priceRange: number,
    minPrice: number,
    ctx: CanvasRenderingContext2D
  ) {
    const open = kline.open;
    const close = kline.close;
    const high = kline.high;
    const low = kline.low;

    const x = index * (this.candleWidth + this.candlePadding);
    const bodyHeight = (Math.abs(open - close) / priceRange) * (this.canvasHeight - this.canvasPadding);
    const wickHeight = ((high - low) / priceRange) * (this.canvasHeight - this.canvasPadding);

    const color = close >= open ? UP_CANDLE_COLOR : DOWN_CANDLE_COLOR;

    // draw body
    const bodyY =
      close >= open
        ? (1 - (close - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding)
        : (1 - (open - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding);
    ctx.fillStyle = color;
    ctx.fillRect(this.backShift + x, this.canvasPadding + bodyY, this.candleWidth, bodyHeight);

    // draw wick
    const wickY = this.canvasPadding + (1 - (high - minPrice) / priceRange) * (this.canvasHeight - this.canvasPadding);
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.backShift + x + this.candleWidth / 2, wickY);
    ctx.lineTo(this.backShift + x + this.candleWidth / 2, wickY + wickHeight);
    ctx.stroke();
  }

  private renderPriceScale(maxPrice: number, priceStep: number, ctx: CanvasRenderingContext2D) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i <= this.scaleStep; i++) {
      const price = maxPrice - i * priceStep;
      const y = (i / this.scaleStep) * this.scaleHeight + 10 - this.canvasPadding;
      ctx.fillText(price.toFixed(2), this.scalePaddingLeft + this.scaleWidth, y);
    }
  }

  private renderDatetimeLabels(
    candles: CandleChartData[],
    limit: number,
    ctx: CanvasRenderingContext2D
  ) {
    const labelStep = Math.ceil(limit / 5); // value to control the number of labels displayed

    candles.forEach((kline: CandleChartData, index: number) => {
      if (index % labelStep === 0) {
        const timestamp = kline.openTime;
        const date = new Date(timestamp);
        const formattedDate = format(date, 'MMM dd hh:mm aa');
        const x =
          this.scalePaddingLeft +
          this.scaleWidth +
          index * (this.candleWidth + this.candlePadding) +
          this.candleWidth / 2;
        ctx.fillText(formattedDate, x, this.canvasHeight - 20);
      }
    });
  }
}
