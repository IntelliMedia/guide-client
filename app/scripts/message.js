initialize();

function initialize() {
    console.info("Initialize message send UI");

    $('.sendMessageButton').each(function () {
        $(this).on("click", sendMessage);
    });
}

function sendMessage() {

    try
    {
    console.info("SendMessage");

    var msgText = $('#message-area').val();
    var msg = JSON.parse(msgText);

    msg.context.classId = getClassId();
    msg.context.groupId = getGroupId();       

    SendGuideEvent(
        msg.actor,
        msg.action,
        msg.target,
        msg.context);
    } catch(e) {
        showPopup(
            'error',
            "Unable to send message",
            e.message);        
    }
}

function getStudentId() {
    var studentId = $('#studentIdInput').val();
    if (!studentId) {
        studentId = randomStudentId();
        $('#studentIdInput').val(studentId);
    }

    return studentId;
}
