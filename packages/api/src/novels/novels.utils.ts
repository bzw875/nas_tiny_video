import chardet from 'chardet';
import * as iconv from 'iconv-lite';

/** 判断编码并转为 UTF-8 字符串（与 txtOnlineRead server/src/utils.ts 一致） */
export function convertToUtf8(buffer: Buffer): [boolean, string] {
  try {
    const detectedEncoding = chardet.detect(buffer);
    const newStr = iconv.decode(buffer, detectedEncoding || 'GB18030');
    return [detectedEncoding !== 'UTF-8', newStr];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('读取或转换文件时出错:', msg.slice(0, 100));
    return [false, ''];
  }
}

export const NOVEL_PAGE_SIZE = 5000;
