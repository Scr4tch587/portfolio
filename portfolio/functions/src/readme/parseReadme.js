const { unified } = require('unified');
const remarkParse = require('remark-parse').default;
const remarkGfm = require('remark-gfm').default;

const MAX_SOURCE_BYTES = 500 * 1024;

function collectImageRefs(node, refs) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'image' && node.url) {
    refs.push({
      originalUrl: node.url,
      alt: node.alt || '',
      title: node.title || null,
      inline: true,
    });
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectImageRefs(child, refs));
  }
}

function parseReadmeMarkdown(markdown) {
  const warnings = [];
  let source = String(markdown || '');

  if (Buffer.byteLength(source, 'utf8') > MAX_SOURCE_BYTES) {
    source = Buffer.from(source, 'utf8').subarray(0, MAX_SOURCE_BYTES).toString('utf8');
    warnings.push('README exceeded 500 KB and was truncated.');
  }

  const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
  const imageRefs = [];
  collectImageRefs(tree, imageRefs);

  return {
    tree,
    imageRefs,
    warnings,
  };
}

module.exports = {
  parseReadmeMarkdown,
};
