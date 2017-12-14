var jsonEditor = CodeMirror.fromTextArea(document.getElementById("myTextarea"), {
    lineNumbers: true,
    mode: "application/json",
    gutters: ["CodeMirror-lint-markers"],
    lint: true,
    lintOnChange: true
});

var yamlEditor = CodeMirror.fromTextArea(document.getElementById("myTextarea2"), {
    mode: "yaml",
    readOnly: true
});
var jsonEditor2 = CodeMirror.fromTextArea(document.getElementById("myTextarea3"), {
    mode: "application/json",
    readOnly: true
});


var method = document.getElementById('method')
var xhr = new XMLHttpRequest()
var expectParams = false

method.onchange = () => {
  var needsParams = ['PUT', 'PATCH', 'POST', 'DELETE']
  if (needsParams.includes(method.value)) {
    expectParams = true
    document.getElementById('params-wrapper').classList.remove('hidden')
  }
}

document.getElementById('request-json').onclick = () => {
  var baseRoute = document.getElementById('base').value
  var path = document.getElementById('path').value
  var token = document.getElementById('token').value
  var request = baseRoute + path + '?token=' + token
  var params = document.getElementById('params').value
  document.getElementById('url').innerHTML = request
  document.getElementById('built-url').classList.remove('hidden')

  xhr.open(method.value, request, true)

  if (expectParams) {
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
  }

  xhr.send(params)
  xhr.onreadystatechange = () => {
    jsonEditor.setValue(xhr.response)
  }
}


function processJSON() {
    var jsonString = jsonEditor.getValue().trim();
    if (this.tryParseJSON(jsonString) === true) {

        var json = JSON.parse(jsonString);
        var yamlReady = this.buildSwaggerJSON(json);
        console.log(yamlReady);
        jsonEditor2.setValue(JSON.stringify(yamlReady, null, 4));
        var x = stringify(yamlReady);
        yamlEditor.setValue(x);
        tinyToast.show('✔ Conversion complete')

    } else {
        tinyToast.show('Invalid JSON. Have properties names in quotes')
    }
}

function tryParseJSON(jsonString) {
    try {
        var o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
            return true;
        }
    } catch (e) {
        console.error(e, jsonString);
        return false;
    }

    return false;
}

function buildSwaggerJSON(data) {
    var keys = Object.keys(data)
    var op = {
        required: keys,
        properties: {}
    };
    keys.forEach(function (x) {
        var typeData = typeOf(data[x]);
        if (["array", "object", "null"].indexOf(typeData) === -1)
            op.properties[x] = {
                "type": typeData
            };
        else {
            switch (typeData) {
                case "array":
                    typeData = typeOf(data[x][0]);
                    if (typeData === "array") {
                        // op.properties[x] = { "type": "array", "items": { type: typeData } };
                        throw new Error("Complex object (array of array etc...)", data[x][0]);
                    }
                    if (typeData === "object") {
                        op.properties[x] = {
                            "type": "array",
                            "items": {
                                type: typeData,
                                properties: buildSwaggerJSON(data[x][0]).properties
                            }
                        };
                        break;
                    }
                    op.properties[x] = {
                        "type": "array",
                        "items": {
                            type: typeData
                        }
                    };

                    break;
                case "object":
                    op.properties[x] = buildSwaggerJSON((data[x]));
                    op.properties[x].type = "object";
                    break;
                default:
                    console.warn("skipping ", typeData);
                    break;
            }
        }
    });
    return op;
}
