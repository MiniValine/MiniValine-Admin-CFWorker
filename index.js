import kernel from 'ohhho/worker/kernel'
const md5 = require('blueimp-md5')

let ohhho_logstatus=0
async function handleRequest(event) {
  const request = event.request;
  const req = request;
  const urlStr = req.url;
  const urlObj = new URL(urlStr);
  const path = urlObj.href.substr(urlObj.origin.length);


  try {
    if (path == "/favicon.ico") {
      return fetch("https://cdn.jsdelivr.net/gh/MiniValine/MiniValine.github.io@master/favicon.ico");
    }
    if (path=="/") {
      if (request.method == "POST") {
        let data = await request.json();
        event.waitUntil(checkData(data))
      }
    }
    /*********************************************************************************************** */
    /*********************************************************************************************** */
    if (path.startsWith("/ohhho")) {
      if (kernel.util.getCookie(request, "password") == md5(PASSWORD) && kernel.util.getCookie(request, "username") == md5(USERNAME)) {
        ohhho_logstatus = 1
      }else{
        return new Response(kernel.page.login, kernel.util.headers.html)
      }
      if(!ohhho_logstatus){
        return new Response(kernel.page.login, kernel.util.headers.html)
      }
      if (path.startsWith("/ohhho/dash")) {
        return new Response(Dash_Page, kernel.util.headers.html)
      }
      if (path.startsWith("/ohhho/ListAll")) {
        let all= await kernel.admin.listAll()
        return new Response(JSON.stringify(all), kernel.util.headers.js);
      }
      if (path.startsWith("/ohhho/NodeChange")) {
        if(request.method=="POST"){
          let body=await kernel.util.getPostBody(request)
          let data=JSON.parse(body.data)
          let c=await changeData(data)
          return new Response(JSON.stringify(c), kernel.util.headers.json);
        }
      }
      if (path.startsWith("/ohhho/NodeDel")) {
        if(request.method=="POST"){
          let body=await kernel.util.getPostBody(request)
          let data=JSON.parse(body.data)
          let c=await kernel.admin.deleteData(data)
          return new Response(JSON.stringify(c), kernel.util.headers.json);
        }
      }
      return Response.redirect(OHHHOPATH+"/ohhho/dash", 302)
    }
    /*********************************************************************************************** */
    return new Response("Hello world", kernel.util.headers.js);
  } catch (e) {
    console.log(e);
    await API.put("test-error", JSON.stringify(e));
    return new Response("!!Error!!" + e, kernel.util.headers.html);
  }
}

/*********************************************************************************************** */

/*********************************************************************************************** */
// Fetch触发器
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event));
});

/*********************************************************************************************** */
async function checkData(data){
  let meta=await kernel.cf.kv.getMeta()
  let mymail=AUTHEMAIL
  let isSpam = await checkSpam(data)
  isSpam=await isSpam.text()
  if(isSpam=="true"){
    data.approval=false
    await changeData(data)
  }
  if (data.pid&&isSpam!="true") {
    // 回复rid
    let hash= meta.sub[data.url].h
    let c = await kernel.ipfs.cat(hash);
    let ss={}
    for (let index = 0; index < c.length; index++) {
      const element = c[index];
      if (element.id == data.pid) {
        if (element.id == data.rid) {
          ss=element
        } else {
          for (let j = 0; j < element.children.length; j++) {
            const ele = element.children[j];
            if (ele.id == data.rid) {
              ss=ele
              break;
            }
          }
        }
        break;
      }
    }
    if(data.mail!=ss.mail&&ss.mail!=mymail){
      await PostMail(ss, data)
    }
  }
  if (data.mail!=mymail) {
    await PostMailAdmin(data)
  }
}
async function changeData(data){
  if(data.approval){
    await submitHam(data)
  }else{
    await submitSpam(data)
  }
  let c=await kernel.admin.changeData(data)
  return c
}
/*********************************************************************************************** */
async function PostMail(p, s) {
  return fetch(
    new Request( APIURL + "/api/postmail", {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36 Edg/88.0.100.0",
      },
      body:JSON.stringify({
        "type":1,
        "p":p,
        "s":s
      })})
  );
}
async function PostMailAdmin(s) {
  return fetch(
    new Request( APIURL + "/api/postmail", {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36 Edg/88.0.100.0",
      },
      body:JSON.stringify({
        "type":2,
        "s":s
      })})
  );
}
async function checkSpam(s) {
  const comment = {
    ip: s.ip,
    useragent: s.ua,
    content: s.comment,
    email: s.mail,
    name: s.nick,
    url:s.link,
    type: s.rid ? 'reply' : 'comment',
    permalink: `${SITEPATH}${s.url}`,
  }

  return fetch(
    new Request( APIURL + "/api/akismet", {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36 Edg/88.0.100.0",
      },
      body:JSON.stringify({
        type:"checkSpam",
        comment:comment,
      })})
  );
}
async function submitSpam(s) {
  const comment = {
    ip: s.ip,
    useragent: s.ua,
    content: s.comment,
    email: s.mail,
    name: s.nick,
    url:s.link,
    type: s.rid ? 'reply' : 'comment',
    permalink: `${SITEPATH}${s.url}`,
  }

  return fetch(
    new Request( APIURL + "/api/akismet", {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36 Edg/88.0.100.0",
      },
      body:JSON.stringify({
        type:"submitSpam",
        comment:comment,
      })})
  );
}
async function submitHam(s) {
  const comment = {
    ip: s.ip,
    useragent: s.ua,
    content: s.comment,
    email: s.mail,
    name: s.nick,
    url:s.link,
    type: s.rid ? 'reply' : 'comment',
    permalink: `${SITEPATH}${s.url}`,
  }

  return fetch(
    new Request( APIURL + "/api/akismet", {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36 Edg/88.0.100.0",
      },
      body:JSON.stringify({
        type:"submitHam",
        comment:comment,
      })})
  );
}
/********************************************************************************************************** */

let Dash_Page=`
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OHHHO | Dash</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/mdui@1.0.1/dist/css/mdui.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@10.6.0/styles/github.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@4.0.0/github-markdown.css" />
    <style>
      ::-webkit-scrollbar-track-piece {
        background-color: #f8f8f8;
      }
      ::-webkit-scrollbar {
        width: 9px;
        height: 9px;
      }
      ::-webkit-scrollbar-thumb {
        background-color: #ddd;
        background-clip: padding-box;
        min-height: 28px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: #bbb;
      }
      * {
        padding: 0;
        margin: 0;
      }
      .msvg{
        -webkit-font-smoothing: antialiased;
        display: inline-block;
        font-style: normal;
        font-weight: 400;
        font-variant: normal;
        text-rendering: auto;
        line-height: 1.75em;
        vertical-align:middle;
        width: 1.2em;
        height: 1.2em;
      }
    </style>
  </head>
  <body>
    <div class="mdui-container-fluid">
      <div id="wrap" class="mdui-panel" mdui-panel>
      </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mdui@1.0.1/dist/js/mdui.min.js"></script>
    <script>
      function List(){
        $.ajax({
        url: "/ohhho/ListAll",
        type: "GET",
        dataType:"json",
        success: function (data) {
          for (let index = 0; index < data.length; index++) {
            const element = data[index];
            AddOne(element)
          }
          $("#wrap :checkbox").click(function(){
            let id=$(this).parents(".mdui-panel-item-open").attr('id')
            const Node = JSON.parse(decodeURIComponent(window.atob(document.querySelector('#'+id + ' .data').textContent)))
            $('#'+id+' .mdui-progress').css("display","block")
            if(Node.approval){
              Node.approval=false
            }else{
              Node.approval=true
            }
            document.querySelector('#'+id + ' .data').textContent=window.btoa(encodeURIComponent(JSON.stringify(Node)))
            ChangeOne(Node)
          });
          $("#wrap textarea").on('blur',function(){
            let id=$(this).parents(".mdui-panel-item-open").attr('id')
            const Node = JSON.parse(decodeURIComponent(window.atob(document.querySelector('#'+id + ' .data').textContent)))
            Node.commentHtml=$(this).val()     
            $('#'+id+' .mdui-progress').css("display","block")
            document.querySelector('#'+id + ' .data').textContent=window.btoa(encodeURIComponent(JSON.stringify(Node)))
            ChangeOne(Node)
          })
          $("#wrap .del").on('click',function(){
            let id=$(this).parents(".mdui-panel-item-open").attr('id')
            const Node = JSON.parse(decodeURIComponent(window.atob(document.querySelector('#'+id + ' .data').textContent)))
            $('#'+id+' .mdui-progress').css("display","block")
            console.log(Node)
            DelOne(Node)
          })
          $("#wrap .view").on('click',function(){
            let id=$(this).parents(".mdui-panel-item-open").attr('id')
            const Node = JSON.parse(decodeURIComponent(window.atob(document.querySelector('#'+id + ' .data').textContent)))
            console.log(Node.url)
            window.open(\`${SITEPATH}\${Node.url}\\#\${Node.id}\`,'_blank');  
          })
        },
        error: function (data) {
          console.log(data)
        },
      });
      }
      List()
      function DelOne(node){
        $.ajax({
          url: "/ohhho/NodeDel",
          type: "POST",
          dataType:"json",
          data:{"data":JSON.stringify(node)},
          success: function (data) {
            console.log(data)
            $('#id-'+node.id+' .mdui-progress').css("display","none")
            $('#id-'+node.id).remove()
          },
          error: function (data) {
            console.log(data)
          },
        });
      }
      function ChangeOne(node){
        $.ajax({
          url: "/ohhho/NodeChange",
          type: "POST",
          dataType:"json",
          data:{"data":JSON.stringify(node)},
          success: function (data) {
            console.log(data)
            $('#id-'+node.id+' .mdui-progress').css("display","none")
          },
          error: function (data) {
            console.log(data)
          },
        });
      }
      function AddOne(it){
        let sd=ONE(it)
        document.getElementById("wrap").innerHTML+=sd
      }
      function ONE(it){
        let bnMeta=""
        let onMeta=""
        let bn=""
        let on=""
        try{
          bn=it.browser.name.toLowerCase()
        }catch(e){}
        try{
          on=it.os.name.toLowerCase()
        }catch(e){}
        if (bn) {
          bnMeta += '<i><embed class="msvg" src="https://cdn.jsdelivr.net/npm/ohhho/imgs/svg/'
          if (['mobile', 'samsung', 'samsung browser'].includes(bn)) {
            bnMeta += 'mobile-alt'
          } else if (['android', 'android browser'].includes(bn)) {
            bnMeta += 'android'
          } else if (['mobile safari', 'safari'].includes(bn)) {
            bnMeta += 'safari'
          } else if (['ie', 'iemobile'].includes(bn)) {
            bnMeta += 'internet-explorer'
          } else if (['wechat'].includes(bn)) {
            bnMeta += 'weixin'
          } else if (['qqbrowser', 'qqbrowserlite', 'qq'].includes(bn)) {
            bnMeta += 'qq'
          } else if (['baiduboxapp', 'baidu'].includes(bn)) {
            bnMeta += 'paw'
          } else if (['chrome', 'chromium', 'chrome headless', 'chrome webview'].includes(bn)) {
            bnMeta += 'chrome'
          } else if (['opera mobi', 'opera', 'opera coast', 'opera mini', 'opera tablet'].includes(bn)) {
            bnMeta += 'opera'
          } else if (['firefox', 'edge'].includes(bn)) {
            bnMeta += bn
          } else {
            bnMeta += 'snapchat-ghost'
          }
          bnMeta += '.svg"/></i>'
        } else {
          bnMeta += '<i><embed class="msvg" src="https://cdn.jsdelivr.net/npm/ohhho/imgs/svg/stars.svg"/></i>'
        }
        
        if (on) {
          onMeta += '<i><embed class="msvg" src="https://cdn.jsdelivr.net/npm/ohhho/imgs/svg/'
          if (['mac', 'mac os', 'ios'].includes(on)) {
            onMeta += 'apple'
          } else if (['chromium', 'chromium os'].includes(on)) {
            onMeta += 'chrome'
          } else if (['firefox', 'firefox os'].includes(on)) {
            onMeta += 'firefox'
          } else if (['windows phone', 'windows'].includes(on)) {
            onMeta += 'windows'
          } else if (['android', 'linux', 'ubuntu', 'suse', 'redhat', 'fedora', 'centos', 'blackberry'].includes(on)) {
            onMeta += on
          } else {
            onMeta += 'snapchat-ghost'
          }
            onMeta += '.svg"/></i>'
		
        } else {
          onMeta += '<i><embed class="msvg" src="https://cdn.jsdelivr.net/npm/ohhho/imgs/svg/magic.svg"/></i>'
        }
        sd= \`
          <div id="id-\${it.id}" class="mdui-panel-item">
            <div class="mdui-panel-item-header">
              <div class="mdui-panel-item-title">
                <div class="mdui-chip">
                  <img class="mdui-chip-icon" src="https://cdn.v2ex.com/gravatar/\${it.mailMd5}?s=48&d=robohash"/>
                  <span class="mdui-chip-title">\${it.nick}</span>
                </div>
              </div>
              <div class="mdui-panel-item-summary">\${it.commentHtml}</div>
              <i class="mdui-panel-item-arrow mdui-icon material-icons">keyboard_arrow_down</i>
            </div>
            <div class="mdui-panel-item-body">
              <div class="mdui-card">
                <div class="mdui-card-content">
                    <img class="mdui-card-header-avatar" src="https://cdn.v2ex.com/gravatar/\${it.mailMd5}?s=48&d=robohash"/>
                    <div class="mdui-card-header-title">\${it.nick}</div>
                    <div class="mdui-card-header-subtitle"><i class="mdui-icon material-icons">&#xe192;</i>\${it.createdAt}</div>
                    <div class="mdui-card-header-subtitle"><i class="mdui-icon material-icons">&#xe0be;</i>\${it.mail}</div>
                    <div class="mdui-card-header-subtitle"><i class="mdui-icon material-icons">&#xe157;</i>\${it.link}</div>
                    <div class="mdui-card-header-subtitle"><i class="mdui-icon material-icons">&#xe55f;</i>\${it.ip}</div>
                    <div class="mdui-card-header-subtitle">\${bnMeta} \${it.browser.name} \${it.browser.version}</div>
                    <div class="mdui-card-header-subtitle">\${onMeta} \${it.os.name} \${it.os.version}</div>
                    <div class="mdui-card-header-subtitle"><i class="mdui-icon material-icons">&#xe85d;</i>\${it.ua}</div>
                    <div class="mdui-card-content">\${it.commentHtml}</div>
                </div>
              </div>
              <div class="mdui-panel-item-actions">
                <div class="mdui-textfield mdui-textfield-floating-label">
                  <textarea class="mdui-textfield-input">\${it.commentHtml}</textarea>
                </div>
                <label class="mdui-switch">
                  批准
                  <input type="checkbox" \${it.approval?"checked":""}/>
                  <i class="mdui-switch-icon"></i>
                </label>
                <button class="mdui-btn mdui-ripple view">查看</button>
                <button class="mdui-btn mdui-ripple del">删除</button>
                <div class="mdui-progress" style="display:none">
                  <div class="mdui-progress-indeterminate"></div>
                </div>
              </div>
            </div>
          <div class="data" style="display:none">\${window.btoa(encodeURIComponent(JSON.stringify(it)))}</div>
          </div>
        \`
        return sd
      }
    </script>
  </body>
</html>

`
/****************************************************************************************************** */
addEventListener("scheduled", event => {
  event.waitUntil(handleScheduled(event))
})
async function handleScheduled(event) {
  let meta = await kernel.cf.kv.getMeta()
  // console.log(meta.key)
  for (let index = 0; index < meta.key.length; index++) {
    const element = meta.key[index];
    let it = meta.sub[element].h
    // console.log(it)
    let m=await kernel.ipfs.cat(it)
    // m=await m.text()
    // console.log(m)
    console.log("OK")
  }
}
/****************************************************************************************************** */
