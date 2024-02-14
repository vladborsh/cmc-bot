import { add, eachDayOfInterval, addMinutes } from 'date-fns';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { BinanceClient } from './exchange/binance-client';
import { EnvConfig } from './env-config';
import { DynamicConfig } from './dynamic-config';
import { TechIndicatorService } from './indicators/tech-indicator-service';
import { ChartCanvasRenderer } from './exchange/chart-canvas-renderer';
import { GeneralTimeIntervals } from './enums';
import dotenv from 'dotenv';
import { IExchangeClient } from './interfaces/exchange-client.interface';
import { CapitalComClient } from './exchange/capital-com-client';
import { CapitalComSession } from './exchange/capital-com-session';
import { SmIndicatorInputs } from './interfaces/indicator/sm-indicator-request';
import { CandleChartData } from './interfaces/charts/candlestick-chart-data';

async function init(asset: string) {
  dotenv.config();
  const envConfig = EnvConfig.getInstance();
  const dynamicConfig = DynamicConfig.getInstance(envConfig);
  let dataFetcher: IExchangeClient;

  if (asset.endsWith('USDT')) {
    dataFetcher = BinanceClient.getInstance(
      envConfig,
      dynamicConfig,
    );
  } else {
    const capitalComSession = CapitalComSession.getInstance(envConfig);
    await capitalComSession.checkAndRenewSession();
    dataFetcher = CapitalComClient.getInstance(
      envConfig,
      capitalComSession,
    );
  }

  const dynamicConfigValues = await dynamicConfig.getConfig()
  const technicalInfoService = TechIndicatorService.getInstance(envConfig);
  const imageRenderer = new ChartCanvasRenderer(dynamicConfigValues);

  return {
    dataFetcher,
    technicalInfoService,
    imageRenderer,
  }
}

interface TimeShift {
  hours?: number;
  minutes?: number;
}

async function generatePDF(
  startDate: Date,
  endDate: Date,
  interval: GeneralTimeIntervals,
  pairTimeShift: TimeShift,
  iterationTimeShift: TimeShift,
  historyShift: TimeShift,
  asset: string,
  targetDayOfWeek?: number,
  indicatorInput?: SmIndicatorInputs,
): Promise<void> {
  console.log('init...')
  const {
    dataFetcher,
    technicalInfoService,
    imageRenderer,
  } = await init(asset);
  const pdfDoc = await PDFDocument.create();

  let dateTime = startDate;

  while (dateTime <= endDate) {
    // Check if the current date is a weekend
    if (dateTime.getDay() === 0 || dateTime.getDay() === 6) {
      dateTime = add(dateTime, iterationTimeShift);
      // Skip this iteration of the loop if it's Saturday (6) or Sunday (0)
      continue;
    }

    // Check if the current dateTime is the target day of the week; if not, adjust it
    if (targetDayOfWeek) {
      const dayOfWeek = dateTime.getDay();
      if (dayOfWeek !== targetDayOfWeek) {
        // Calculate the difference in days to the next target day of the week
        const daysUntilNextTargetDay = (7 + targetDayOfWeek - dayOfWeek) % 7 || 7;
        dateTime = add(dateTime, { days: daysUntilNextTargetDay });
        // Check if the adjusted dateTime exceeds endDate; if so, break the loop
        if (dateTime > endDate) break;
      }
    }

    console.log(`\n${dateTime}`)
    const startTime = add(dateTime, historyShift).getTime();
    const endTime = dateTime.getTime();

    let candles: CandleChartData[];
    try {
      candles = await dataFetcher.getCandles(asset, interval, 1000, startTime, endTime);
    } catch (e) {
      console.log((e as any).message || (e as any).toString());
      dateTime = dateTime = add(dateTime, iterationTimeShift);
      continue;
    }

    const technicalInfo = await technicalInfoService.getSMIndicator({
      chartData: candles,
      inputs: indicatorInput,
    });
    const image1 = imageRenderer.generateImage(candles, technicalInfo.data || {});

    const shiftedDate = add(dateTime, pairTimeShift);
    const shiftedStartTime = add(shiftedDate, historyShift).getTime();
    const shiftedEndTime = shiftedDate.getTime();


    let shiftedCandles: CandleChartData[];
    try {
      shiftedCandles = await dataFetcher.getCandles(asset, interval, 1000, shiftedStartTime, shiftedEndTime);
    } catch (e) {
      console.log((e as any).message || (e as any).toString());
      dateTime = dateTime = add(dateTime, iterationTimeShift);
      continue;
    }

    const shiftedTechnicalInfo = await technicalInfoService.getSMIndicator({
      chartData: shiftedCandles,
      inputs: indicatorInput,
    });
    const image2 = imageRenderer.generateImage(shiftedCandles, shiftedTechnicalInfo.data || {});

    const [image1Embed, image2Embed] = [await pdfDoc.embedPng(image1), await pdfDoc.embedPng(image2)];
    const page = pdfDoc.addPage();

    // Calculate image placement to fit both on the same page
    const { width, height } = page.getSize();
    const imageHeight = height / 2; // Adjust based on your needs

    page.drawImage(image1Embed, { x: 0, y: height / 2, width: width, height: imageHeight });
    page.drawImage(image2Embed, { x: 0, y: 0, width: width, height: imageHeight });

    // Adjust the dateTime increment based on the interval logic
    dateTime = add(dateTime, iterationTimeShift);
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('test.pdf', pdfBytes);
  console.log('PDF Generated: tradingReport.pdf');
}

// Example usage BTC
/* generatePDF(
  new Date(2023, 10, 1, 15),
  new Date(2024, 0, 7),
  GeneralTimeIntervals.h1,
  { hours: 48 },
  { hours: 24*7 },
  { hours: -500 },
  'BTCUSDT',
  2,
  {
    isEODShown: true,
  }
); */

generatePDF(
  new Date(2023, 10, 1, 14, 30),
  new Date(2024, 1, 13, 14, 30),
  GeneralTimeIntervals.m1,
  { minutes: 50 },
  { hours: 24 },
  { hours: -10 },
  'US100',
  undefined,
  {
    isEODShown: true,
    timings: [
      {
        time: '14:30',
        label: '9:30',
      }, {
        time: '14:50',
        label: 'Macro',
      }, {
        time: '15:10',
        label: '',
      }]
  }
);
