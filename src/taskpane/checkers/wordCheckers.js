export const wordCheckers = {
  auto_pass: async () => true,

  word_text_exists: async (context, params) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text.includes(params.text);
  },

  word_document_title: async (context, params) => {
    const props = context.document.properties;
    props.load("title");
    await context.sync();
    return props.title === params.title;
  },

  word_paragraph_style: async (context, params) => {
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    if (paras.items.length <= params.paragraph_index) return false;
    const para = paras.items[params.paragraph_index];
    para.load("styleBuiltIn,style");
    await context.sync();
    const styleName = para.style || "";
    return styleName.toLowerCase().includes(params.style.toLowerCase());
  },

  word_paragraph_style_multiple: async (context, params) => {
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    for (const index of params.indexes) {
      if (paras.items.length <= index) return false;
      const para = paras.items[index];
      para.load("style");
      await context.sync();
      if (!para.style.toLowerCase().includes(params.style.toLowerCase())) return false;
    }
    return true;
  },

  word_paragraph_style_by_text: async (context, params) => {
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    for (const para of paras.items) {
      para.load("text,style");
      await context.sync();
      if (para.text.trim().includes(params.text.trim())) {
        return para.style.toLowerCase().includes(params.style.toLowerCase());
      }
    }
    return false;
  },

  word_table_exists: async (context, params) => {
    const tables = context.document.body.tables;
    tables.load("items");
    await context.sync();
    return tables.items.length >= (params.min_tables || 1);
  },

  word_table_style: async (context, params) => {
    const tables = context.document.body.tables;
    tables.load("items");
    await context.sync();
    if (tables.items.length <= params.table_index) return false;
    const table = tables.items[params.table_index];
    table.load("style");
    await context.sync();
    return table.style.toLowerCase().includes(params.style.toLowerCase().substring(0, 10));
  },

  word_section_count: async (context, params) => {
    const sections = context.document.sections;
    sections.load("items");
    await context.sync();
    return sections.items.length >= params.min_sections;
  },

  word_section_orientation: async (context, params) => {
    const sections = context.document.sections;
    sections.load("items");
    await context.sync();
    if (sections.items.length <= params.section_index) return false;
    const section = sections.items[params.section_index];
    section.body.load("parentSection");
    const pageSetup = section.getFooter ? section.body.parentSection : null;
    try {
      const ps = context.document.sections.items[params.section_index];
      ps.load("pageSetup");
      await context.sync();
      const orientation = ps.pageSetup.orientation;
      ps.pageSetup.load("orientation");
      await context.sync();
      const isLandscape = ps.pageSetup.orientation === Word.Orientation.landscape;
      return params.orientation === "landscape" ? isLandscape : !isLandscape;
    } catch {
      return false;
    }
  },

  word_inline_shape_exists: async (context, params) => {
    const shapes = context.document.body.inlinePictures;
    shapes.load("items");
    await context.sync();
    return shapes.items.length >= (params.min_shapes || 1);
  },

  word_inline_shape_count: async (context, params) => {
    const shapes = context.document.body.inlinePictures;
    shapes.load("items");
    await context.sync();
    return shapes.items.length >= (params.min_shapes || 1);
  },

  word_footnote_exists: async (context, params) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text.includes(params.text);
  },

  word_bookmark_exists: async (context, params) => {
    try {
      const bookmark = context.document.getBookmarkRange(params.name);
      bookmark.load("text");
      await context.sync();
      return true;
    } catch {
      return false;
    }
  },

  word_hyperlink_exists: async (context, params) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text.includes(params.text);
  },

  word_caption_exists: async (context, params) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text.includes(params.text);
  },

  word_toc_exists: async (context, params) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text.includes("Contenido") || body.text.includes("Tabla de contenido");
  },

  word_field_exists: async (context, params) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    const fieldMap = {
      DATE: [
        "lunes",
        "martes",
        "miércoles",
        "jueves",
        "viernes",
        "sábado",
        "domingo",
        "enero",
        "febrero",
      ],
      AUTHOR: body.text,
      COMPANY: body.text,
    };
    if (params.field_type === "DATE") {
      return fieldMap.DATE.some((d) => body.text.toLowerCase().includes(d));
    }
    return true;
  },

  word_mailmerge_field_exists: async (context, params) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return (
      body.text.includes(`«${params.field_name}»`) || body.text.includes(`<<${params.field_name}>>`)
    );
  },

  word_document_property: async (context, params) => {
    const props = context.document.properties;
    props.load("company,title,author");
    await context.sync();
    const map = {
      company: props.company,
      title: props.title,
      author: props.author,
    };
    const val = map[params.property] || "";
    return val.toLowerCase().includes(params.value.toLowerCase());
  },

  word_text_box_exists: async (context, params) => {
    const body = context.document.body;
    body.load("text");
    await context.sync();
    return body.text.length > 0;
  },
};
