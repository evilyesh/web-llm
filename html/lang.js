const lang = {
    wrap: '\n\`\`\`\n',
    errGet: 'Error occurred while getting settings: ',
    errSend: 'Error occurred while sending path: ',
    pthEmp: 'Path is empty',
    errPrm: 'Error occurred while sending prompt: ',
    httpErr: 'HTTP error! status: ',
    errReq: 'Error occurred while sending request: ',
    errFc: 'Error occurred while saving file content: ',
    errMsg: 'Error: ',
    smMsg: 'Error: ',
    userMsg: 'User message',
    forModelFileIns: 'you write file name without colon or ###, please follow instruction of code formating',
    noTextSelected: 'No text for send... inter prompt.',
    modelFormatFollow: 'please repeat with files names formated how i ask in instruction',
    requestInProgress: 'Request in progress',
    noQueryProvided: 'No query provided'
};

const pattern = '([\\s\\S]*?)\\`{3}.*?\\n([\\s\\S]*?)\\`{3}';
