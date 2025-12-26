import NexusArrayBufferPool from './index.js'

const nexus = new NexusArrayBufferPool();

const arrayBuffer = new ArrayBuffer(1024);
nexus.free(arrayBuffer);