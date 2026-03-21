const fs = require('fs');

const dirName = '/Volumes/banzhaowu/FormatFactory/BaiduNetdisk/null/'

const fileName = 'IMG_8752.jpg'

fs.readFile(dirName + fileName, 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});
