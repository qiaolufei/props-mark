const vscode = require('vscode');

function main() {
  vscode.window.activeTextEditor.edit(() => {
    const fileText = vscode.window.activeTextEditor.document.getText()
    const fileName = vscode.window.activeTextEditor.document.fileName
    if(fileName.includes('.vue')){
      const result = getProps(fileText)
      writeMarkDown(result);
    }
  });
}

function getProps(text){
  const linesArr = text.split('\n')
  let start = false
  let result = []
  let flag = 0
  let obj = {}
  let secondIsOptions = true // 判断第二行是否为可选值注释
  linesArr.forEach((line,index) => {
    if (line.includes('props')) {
      start = true;
      flag = index;
    }
    if(start){
      if (index - flag === 1 && line.includes('}')){
        start = false
        flag = 0
      }
      if (index-flag === 1) {
        secondIsOptions = linesArr[index + 1].includes('//')
      }
      let arr = line.split(':')
      if (secondIsOptions) {
        switch (index-flag){
          case 1: 
            obj.notes = trim(arr[0].includes('//') ? arr[0].split('//')[1] : '-') // 说明
            break;
          case 2: 
            obj.options = trim(arr[0].includes('//') ? arr[0].split('//')[1] : '-') // 可选值
            break;
          case 3:
            obj.key = trim(foramtKey(arr[0])) // 参数名
            break;
          case 4:
            obj.type = trim(getType(arr[1])) // type类型
            break;
          case 5:
            arr = line.split('default:')
            obj.default = trim(getDefault(arr[1])) || '-' // default值
            break;
          case 6:
            result.push(obj)
            obj = {}
            if (arr[0].includes('validator')) { // 处理validator情况
              let n = index + 1
              while(linesArr[n].split("}")[0].length !== arr[0].split("validator")[0].length) {
                n++
              }
              flag = n+1
            } else {
              flag = index
            }
            break;
          default:
            break;
        }
      } else {
        switch (index-flag){
          case 1: 
            obj.notes = trim(arr[0].includes('//') ? arr[0].split('//')[1] : '-') // 说明
            obj.options = '-'
            break;
          case 2:
            obj.key = trim(foramtKey(arr[0])) // 参数名
            break;
          case 3:
            obj.type = trim(getType(arr[1])) // type类型
            break;
          case 4:
            arr = line.split('default:')
            obj.default = trim(getDefault(arr[1])) || '-' // default值
            break;
          case 5:
            result.push(obj)
            obj = {}
            if (arr[0].includes('validator')) { // 处理validator情况
              let n = index + 1
              while(linesArr[n].split("}")[0].length !== arr[0].split("validator")[0].length) {
                n++
              }
              flag = n+1
            } else {
              flag = index
            }
            break;
          default:
            break;
        }
      }
    }
  });
  return result // props对象数组
}

function trim(str){ // 清空空格、最后一个逗号
  return str === undefined ? undefined : String(str).trim().replace(/,$/gi,"");
}

function foramtKey(str){ // 驼峰写法转为-
  return str.replace(/([A-Z])/g,"-$1").toLowerCase();
}

function getType(str) { // 获取type
  if (str.includes('[')) { // 多个type
    const strArr = str.replace(/\[/g, '').replace(/]/g, '').toLowerCase().split(',')
    const str_result = strArr.filter(x=> x.trim() !== '').join(' \\| ')
    return str_result
  }
  return str.toLowerCase()
}

function getDefault(str){ // 获取default
  if (str.includes("=>")) { // 复杂类型
    if (str.includes("[]")) { // 空数组
      return '[]'
    }
    if (str.includes("{}")) { // 空对象
      return '{}'
    }
    return str.split("=>")[1]
  }
  if (str.includes("''") || str.includes("\"\"")){ // 空字符串
    return ""
  }
  if (str.includes("'") || str.includes("\"")) { // 字符串值
    return str.replace(/'/g, '').replace(/"/g, '')
  }
  return str
}

function writeMarkDown(arr){
  let str = `参数 | 说明 | 类型 | 可选值 | 默认值 \n\r-- | -- | -- | -- | --\n\r`
  arr.sort((a,b)=>a.key.localeCompare(b.key))
  arr.forEach(item=>{
    str += `${item.key} | ${item.notes} | _${item.type}_ | ${item.options} | ${item.default}\n\r`
  })
  vscode.window.createTerminal({name:'Props', message: `${str}`})
  vscode.window.showInformationMessage('Props Success!');
}

module.exports = main
