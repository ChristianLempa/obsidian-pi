let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  while (true) {
    const index = buffer.indexOf("\n");
    if (index < 0) break;
    let line = buffer.slice(0, index);
    buffer = buffer.slice(index + 1);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line) handle(JSON.parse(line));
  }
});

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function respond(command, data) {
  send({
    id: command.id,
    type: "response",
    command: command.type,
    success: true,
    ...(data === undefined ? {} : { data })
  });
}

function handle(command) {
  if (command.type === "get_state") {
    respond(command, { isStreaming: false, pid: process.pid });
  } else if (command.type === "prompt") {
    respond(command);
    send({ type: "agent_start" });
    send({
      type: "message_update",
      message: { role: "assistant", content: [] },
      assistantMessageEvent: { type: "text_delta", delta: `echo:${command.message}` }
    });
    send({ type: "agent_settled" });
  } else if (command.type === "abort") {
    respond(command);
  } else if (command.type === "exit") {
    respond(command);
    process.exit(0);
  } else if (command.type === "hang") {
    // Deliberately leave the request pending for process-exit testing.
  } else {
    respond(command, {});
  }
}
