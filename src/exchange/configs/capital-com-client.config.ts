import { CapComTimeIntervals, GeneralTimeIntervals } from "../../enums";

export const mapGeneralTimeIntervalToCapCom: Record<GeneralTimeIntervals, CapComTimeIntervals> = {
  [GeneralTimeIntervals.m1]: CapComTimeIntervals.MINUTE,
  [GeneralTimeIntervals.m5]: CapComTimeIntervals.MINUTE_5,
  [GeneralTimeIntervals.m15]: CapComTimeIntervals.MINUTE_15,
  [GeneralTimeIntervals.m30]: CapComTimeIntervals.MINUTE_30,
  [GeneralTimeIntervals.h1]: CapComTimeIntervals.HOUR,
  [GeneralTimeIntervals.h4]: CapComTimeIntervals.HOUR_4,
  [GeneralTimeIntervals.d1]: CapComTimeIntervals.DAY,
  [GeneralTimeIntervals.w1]: CapComTimeIntervals.WEEK,
};
