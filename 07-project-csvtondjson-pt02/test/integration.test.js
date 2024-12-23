import { describe, expect, it, jest } from "@jest/globals";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import CSVToNDJSON from "../src/streamComponents/csvtondjson.js";
import Reporter from "../src/streamComponents/reporter.js";

describe("CSV to NDJSON", () => {
  const reporter = new Reporter();
  it("given a csv stream it should parse each line to a valid NDJSON string", async () => {
    const csvString = `id,name,desc\n01,test,mydescription\n02,matheus,descr01\n03,katy,lorem`;
    const csvToJSON = new CSVToNDJSON({
      delimiter: ",",
      headers: ["id", "name", "desc"],
    });
    const spy = jest.fn();
    await pipeline(
      Readable.from(csvString),
      csvToJSON,
      reporter.progress(csvString.length),
      Writable({
        write(chunk, enc, cb) {
          spy(chunk);
          cb(null, chunk);
        },
      })
    );
    const times = csvString.split("\n").length - 1; //minus the header
    expect(spy).toHaveBeenCalledTimes(times);
    const [firstCall, secondCall, thirdCall] = spy.mock.calls;
    expect(JSON.parse(firstCall)).toStrictEqual({
      id: "01",
      name: "test",
      desc: "mydescription",
    });
    expect(JSON.parse(secondCall)).toStrictEqual({
      id: "02",
      name: "matheus",
      desc: "descr01",
    });
    expect(JSON.parse(thirdCall)).toStrictEqual({
      id: "03",
      name: "katy",
      desc: "lorem",
    });
  });
});
