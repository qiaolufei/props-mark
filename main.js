const vscode = require('vscode');
const parser = require('esformatter-parser')
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
  const lines_arr = text.split('\n')
  let result = []
  let start_index,end_index
  // 截取script区间代码
  lines_arr.forEach((line,index) => {
    line.includes('<script>') && (start_index = index + 1)
    line.includes('</script>') && (end_index = index)
  })
  const script_str = lines_arr.slice(start_index, end_index).join('')
  // 获取props参数数组
  const AST = parser.parse(script_str)
  const [export_default_declaration] = AST.body.filter(x=> x.type === 'ExportDefaultDeclaration')
  const [props] = export_default_declaration.declaration.properties.filter(x => x.key.name === 'props')
  const props_nodes = props.value.properties
  props_nodes.forEach(item => {
    let prop_obj = {}
    // 参数名
    prop_obj.key = trim(foramtKey(item.key.name))
    const properties = item.value.properties
    // type类型
    prop_obj.type = trim(getType(properties.filter(x=> x.key.name === 'type')[0].value.toString()))
    // default值
    prop_obj.default = trim(getDefault(properties.filter(x=> x.key.name === 'default')[0].value.toString())) || '-'
    const comments = item.leadingComments || []
    // 说明
    prop_obj.notes = trim(comments[0]?.value || '-')
    // 可选值
    prop_obj.options = trim(comments[1]?.value || '-')
    result.push(prop_obj)
  })
  return result // props对象数组
}

// 清空空格、最后一个逗号
function trim(str){
  return str === undefined ? undefined : String(str).trim().replace(/,$/gi,"");
}

// 驼峰写法转为-
function foramtKey(str){
  return str.replace(/([A-Z])/g,"-$1").toLowerCase();
}

// 处理type
function getType(str) {
  if (str.includes('[')) { // 处理多个type情况
    const strArr = str.replace(/\[/g, '').replace(/]/g, '').toLowerCase().split(',')
    const str_result = strArr.filter(x=> x.trim() !== '').join(' \\| ')
    return str_result
  }
  return str.toLowerCase()
}

// 处理default
function getDefault(str){
  if (str.includes("=>")) { // 复杂类型
    if (str.includes("[]")) { // 空数组
      return '[]'
    }
    if (str.includes("{}")) { // 空对象
      return '{}'
    }
    return str.split("=>")[1].replace(/[\r\n]/g,"").replace(/\ +/g,"").replace(/[(|)]/g,"") // 对象
  }
  if (str.includes("''") || str.includes("\"\"")){ // 空字符串
    return ""
  }
  if (str.includes("'") || str.includes("\"")) { // 字符串值
    return str.replace(/['|"]/g, '')
  }
  return str
}

// 生成markdown格式内容
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
