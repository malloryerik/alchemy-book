import test from "ava"

import * as Char from "../../web/static/js/char"
import * as Crdt from "../../web/static/js/crdt"
import Editor from "../../web/static/js/editor"
import EditorSocket from "../../web/static/js/editor-socket"

class TestChannel {
    sockets: TestEditorSocket[];

    constructor() {
        this.sockets = [];
    }

    public register(socket: TestEditorSocket) {
        this.sockets.push(socket);
    }

    public send(sender: TestEditorSocket, message: any) {
        this.sockets.forEach(socket => {
            if (socket !== sender) {
                socket.receive(message);
            } 
        });
    }
}

// Replaces the EditorSocket sent to the Editor. Rather than using actual
// WebSockets, each fake socket sends the message immediately to all other
// fake sockets which will buffer the messages in the queue. To test various
// network delay scenarios, those messages have to be manually let through
// via `letOneThrough`.
class TestEditorSocket extends EditorSocket {
    // Don't expect a lot of messages while testing, so a simple array
    // will do instead of a queue
    messageQueue: any[];
    fakeChannel: TestChannel;

    constructor(documentId: string, channel: TestChannel) {
        super(documentId);

        this.messageQueue = [];
        this.fakeChannel = channel;
        this.fakeChannel.register(this);
    }

    public connect(initCallback: (_) => void,
                   changeCallback: (_) => void) {
        this.initCallback = initCallback;
        this.changeCallback = changeCallback;
    }

    public sendChange(change: any, lamport: number) {
        this.fakeChannel.send(this, {change, lamport});
    }

    public receive(message: any) {
        this.messageQueue.push(message);
    }

    public letOneThrough() {
        if (this.messageQueue.length === 0) {
            throw Error("No messages left in queue!");
        }

        const message = this.messageQueue.shift();
        this.changeCallback(message);
    }
}

class TestEditor extends Editor {
    public getText() {
        if (this.codemirror.getValue() !== Crdt.to_string(this.crdt)) {
            throw Error("Editor text and stored text do no match");
        }
        return this.codemirror.getValue();
    }

    public letOneThrough() {
        (this.editorSocket as TestEditorSocket).letOneThrough();
    }

    public init(val: Char.Serial[], site: number) {
        this.onInit({
            state: val,
            site
        });
    }
}

function createEditors(n: number): TestEditor[] {
    const editors: TestEditor[] = [];
    const channel = new TestChannel();
    for (let i = 0; i < n; i++) {
        const textarea = document.createElement("textarea");
        document.body.appendChild(textarea);
        const editor = new TestEditor(
            textarea, new TestEditorSocket("mydoc", channel)
        );
        editor.init([], i);
        editors.push(editor);
    }
    return editors;
}

test("simple insertion at various places", t => {
    const [e1, e2] = createEditors(2);
    t.pass();
});