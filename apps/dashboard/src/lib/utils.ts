import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

export function productLineLabel(value: string) {
  const map: Record<string, string> = {
    dash_cam: "行车记录仪",
    video_doorbell: "视频门铃",
    ipc: "IPC 摄像机"
  };

  return map[value] || value;
}

export function issueCategoryLabel(value: string) {
  const map: Record<string, string> = {
    hardware_failure: "硬件故障",
    storage_sd_card: "存储 / SD 卡",
    video_quality: "画质问题",
    connectivity: "联网 / 配网",
    battery_power: "电池 / 供电",
    motion_detection: "移动侦测"
  };

  return map[value] || value;
}
