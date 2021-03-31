const config = require('../elite-dangerous-news-discord-bot-config.json');
const { version, author, license } = require('./package.json');
const fs = require('fs');
const Discord = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment'); require('moment-precise-range-plugin');
const { htmlToText } = require('html-to-text');
const he = require('he');
const forceSync = require('sync-rpc');
const syncGetOwnerUsername = forceSync(require.resolve('./async-as-sync.js'));

const client = new Discord.Client();

// CONSTANTS

// WEBSITES
const AUTHOR_URL = 'https://thealiendrew.github.io';
const PAYPAL_URL = 'https://paypal.me/AlienDrew';

// STATUS TYPES
const PLAY = 'PLAYING';
const WATCH = 'WATCHING';
const LISTEN = 'LISTENING';
const STREAM = 'STREAMING';

// ADMIN PERMISSION
const ADMIN = 'MANAGE_MESSAGES';
// OTHER PERMISSIONS
const SEND = 'SEND_MESSAGES';
const EVERYONE = 'MENTION_EVERYONE';

// EMBED MAXES
const DESCRIPTION_LENGTH = 2048;
const FIELD_VALUE_LENGTH = 1024;
const FIELDS = 25;

// SAVE LOCATION
const SERVER_SAVE_DIR = './servers/';
const SAVE_POSTFIX = '.guild';

// BOT CONSTANTS

const IN_JSON_FORMAT = '?_format=json';

const GITHUB_REPO_URL = 'https://github.com/TheAlienDrew/elite-dangerous-news-discord-bot';
const BOT_NAME = 'Elite Dangerous News';
const DEFAULT_PREFIX = 'edn';
const PRESENCE_NAME = `@${BOT_NAME} help | for commands`;
const NO_PERMISSION = "Sorry, but you don't have permissions for that command.";
const MAIN_BOT_COLOR = 0xCCCCCC; // A SILVER LIKE COLOR
const ED_DOMAIN = 'elitedangerous.com';
const ED_FRONTEND_URL = 'https://www.' + ED_DOMAIN + '/';
const ED_BACKEND_URL = 'https://cms.' + ED_DOMAIN + '/';
const ED_FORUMS_URL = 'https://forums.frontier.co.uk/';
const ED_NODE_URL_PREFIX = ED_BACKEND_URL + 'node/';
const EDN_ARTICLE_URL_PREFIX = ED_FRONTEND_URL + 'news/article/';
const EDN_ARTICLE_IMG_URL_PREFIX = 'https://cms.' + ED_DOMAIN;
const EDN_JSON_URL = ED_BACKEND_URL + 'api/news' + IN_JSON_FORMAT; // NO RSS - because there is no official RSS endpoint
const BOT_IMAGES_URL_PREFIX = 'https://raw.githubusercontent.com/TheAlienDrew/elite-dangerous-news-discord-bot/main/images/'
const EDN_IMAGES_URL_PREFIX = BOT_IMAGES_URL_PREFIX + 'Elite-Dangerous-Logo/';
const EDN_LOGO_SILVER_THUMB = EDN_IMAGES_URL_PREFIX + 'Elite-Dangerous_Silver_Thumbnail.png';
const EDN_LOGO_WHITE_BOT_IMAGE = EDN_IMAGES_URL_PREFIX + 'Elite-Dangerous_White_Bot_Picture.png';
const EDN_ARTICLE_NO_IMAGE = BOT_IMAGES_URL_PREFIX + 'No-Image.png';
const BOT_THUMBNAIL_IMAGE = EDN_LOGO_SILVER_THUMB;
const BOT_FOOTER_IMAGE = EDN_LOGO_WHITE_BOT_IMAGE;
const FEED_INTERVAL_SPEED = 60000; // 1 minute in milliseconds
const ALL_POST_DELAY = 1500; // 1.5 seconds in milliseconds

const ITALIC = '<i>';
const BOLD = '<b>';
const STRIKETHROUGH = '<s>';
const UNDERLINE = '<u>';
const HEADING = '<h>';
const HEADING_START = '<hs>';
const HEADING_END = '<he>';
const HTML_TO_TEXT = {
    wordwrap: null,
    formatters: {
        'customLineBreaks': function (elem, walk, builder, formatOptions) {
            builder.openBlock(formatOptions.leadingLineBreaks || 0);
            builder.closeBlock(formatOptions.trailingLineBreaks || 0);
        },
        'customItalic': function (elem, walk, builder, formatOptions) {
            let tag = formatOptions.tag || '*';
            builder.addInline(tag);
            walk(elem.children, builder);
            builder.addInline(tag);
        },
        'customBold': function (elem, walk, builder, formatOptions) {
            let tag = formatOptions.tag || '**';
            builder.addInline(tag);
            walk(elem.children, builder);
            builder.addInline(tag);
        },
        'customStrikethrough': function (elem, walk, builder, formatOptions) {
            let tag = formatOptions.tag || '~~';
            builder.addInline(tag);
            walk(elem.children, builder);
            builder.addInline(tag);
        },
        'customUnderline': function (elem, walk, builder, formatOptions) {
            let tag = formatOptions.tag || '__';
            builder.addInline(tag);
            walk(elem.children, builder);
            builder.addInline(tag);
        },
        'customLink': function (elem, walk, builder, formatOptions) {
            function getHref () {
                if (formatOptions.ignoreHref) { return ''; }
                if (!elem.attribs || !elem.attribs.href) { return ''; }
                let href = elem.attribs.href.replace(/^mailto:/, '');
                if (formatOptions.noAnchorUrl && href[0] === '#') { return ''; }
                href = (formatOptions.baseUrl && href[0] === '/')
                  ? formatOptions.baseUrl + href
                  : href;
                return he.decode(href, builder.options.decodeOptions);
            }
            const href = getHref();
            if (!href) {
                walk(elem.children, builder);
            } else {
                let text = '';
                builder.pushWordTransform(
                  str => {
                    if (str) { text += str; }
                    return str;
                  }
                );

                builder.addInline('[', { noWordTransform: true });
                walk(elem.children, builder);
                builder.popWordTransform();
                builder.addInline('](' + href + ')', { noWordTransform: true });
            }
        },
        'customImage': function (elem, walk, builder, formatOptions) {
            const attribs = elem.attribs || {};
            const alt = (attribs.alt)
              ? he.decode(attribs.alt, builder.options.decodeOptions)
              : '';
            const src = (!attribs.src)
              ? ''
              : (formatOptions.baseUrl && attribs.src.indexOf('/') === 0)
                ? formatOptions.baseUrl + attribs.src
                : attribs.src;
            const text = (!src)
              ? alt
              : (!alt)
                ? '[[' + src + '](' + src + ')]'
                : '[[' + alt + '](' + src + ')]';

            builder.addInline(text);
        },
        'customIframe': function (elem, walk, builder, formatOptions) {
            const attribs = elem.attribs || {};
            const title = (attribs.title)
              ? he.decode(attribs.title, builder.options.decodeOptions)
              : '';
            const src = (!attribs.src)
              ? ''
              : (formatOptions.baseUrl && attribs.src.indexOf('/') === 0)
                ? formatOptions.baseUrl + attribs.src
                : attribs.src;
            const text = (!src)
              ? title
              : (!title)
                ? '{[' + src + '](' + src + ')}'
                : '{[' + title + '](' + src + ')}';

            builder.addInline(text);
        },
        'customContainer': function (elem, walk, builder, formatOptions) {
            const attribs = elem.attribs || {};
            const aClass = (attribs.class)
              ? he.decode(attribs.class, builder.options.decodeOptions)
              : '';
            // we only want it to get new lines if it is embed
            if (aClass.includes('embed-media')) {
                builder.openBlock({ leadingLineBreaks: formatOptions.leadingLineBreaks });
                walk(elem.children, builder);
                builder.closeBlock({ trailingLineBreaks: formatOptions.trailingLineBreaks });
            } else {
                walk(elem.children, builder);
            }
        },
        'customHeading': function (elem, walk, builder, formatOptions) {
            let tag = formatOptions.tag;
            let tagStart = formatOptions.tagStart || (tag ? tag : '**__');
            let tagEnd = formatOptions.tagEnd || (tag ? tag : '__**');
            builder.openBlock({ leadingLineBreaks: formatOptions.leadingLineBreaks || 0 });
            builder.addInline(tagStart);
            walk(elem.children, builder);
            builder.addInline(tagEnd);
            builder.closeBlock({ trailingLineBreaks: formatOptions.trailingLineBreaks || 0 });
        }
    },
    tags: { 'br': { format: 'customLineBreaks',
                    options: { trailingLineBreaks: 2 } }, // change 2 to 1, for single line breaks
            'div': { format: 'customContainer',
                     options: { trailingLineBreaks: 2 } }, // change 2 to 1, for single line breaks
            'p': { options: { trailingLineBreaks: 2 } }, // change 2 to 1, for single line breaks
            'a': { format: 'customLink' },
            'img': { format: 'customImage' },
            'iframe': { format: 'customIframe' },
            'ul': { options: { itemPrefix: ' • ' } },
            'em': { format: 'customItalic',
                    options: { tag: ITALIC } }, // tag gets replaced after markdown escapes
            'i': { format: 'customItalic',
                   options: { tag: ITALIC } }, // tag gets replaced after markdown escapes
            'strong': { format: 'customBold',
                        options: { tag: BOLD } }, // tag gets replaced after markdown escapes
            'b': { format: 'customBold',
                   options: { tag: BOLD } }, // tag gets replaced after markdown escapes
            'strike': { format: 'customStrikethrough',
                   options: { tag: STRIKETHROUGH } }, // tag gets replaced after markdown escapes
            's': { format: 'customStrikethrough',
                   options: { tag: STRIKETHROUGH } }, // tag gets replaced after markdown escapes
            'u': { format: 'customUnderline',
                   options: { tag: UNDERLINE } }, // tag gets replaced after markdown escapes
            'h1': { format: 'customHeading',
                    options: { tagStart: HEADING_START, tagEnd: HEADING_END, // tags gets replaced after markdown escapes
                               trailingLineBreaks: 2 } }, // change 2 to 1, for single line breaks
            'h2': { format: 'customHeading',
                    options: { tagStart: HEADING_START, tagEnd: HEADING_END, // tags gets replaced after markdown escapes
                               trailingLineBreaks: 2 } }, // change 2 to 1, for single line breaks
            'h3': { format: 'customHeading',
                    options: { tagStart: HEADING_START, tagEnd: HEADING_END, // tags gets replaced after markdown escapes
                               trailingLineBreaks: 2 } }, // change 2 to 1, for single line breaks
            'h4': { format: 'customHeading',
                    options: { tagStart: HEADING_START, tagEnd: HEADING_END, // tags gets replaced after markdown escapes
                               trailingLineBreaks: 2 } }, // change 2 to 1, for single line breaks
            'h5': { format: 'customHeading',
                    options: { tagStart: HEADING_START, tagEnd: HEADING_END, // tags gets replaced after markdown escapes
                               trailingLineBreaks: 2 } }, // change 2 to 1, for single line breaks
            'h6': { format: 'customHeading',
                    options: { tagStart: HEADING_START, tagEnd: HEADING_END, // tags gets replaced after markdown escapes
                               trailingLineBreaks: 2 } } // change 2 to 1, for single line breaks
         }
};

const NEWEST_POST_FILE = './newest-post.txt';

const DEFAULT_SETTINGS = {prefix: DEFAULT_PREFIX,
                          feedChannel: null,
                          feedRole: null};

// BOT VARIABLES

let serversFolderAccess = true; // prevents creation of settings files when it doesn't have access to servers folder

// each server's settings will be stored as an entry in the settings like such:
// [server id]: {settings object}
// the inital settings object get's a deep copy of the DEFAULT_SETTINGS object
let settings = {};

// FUNCTIONS

// returns the user from a mention
function getUserFromMention(mention) {
    if (!mention) return false;

    if (mention.startsWith('<@') && mention.endsWith('>')) {
        mention = mention.slice(2, -1);

        if (mention.startsWith('!')) mention = mention.slice(1);

        return client.users.cache.get(mention);
    }
}

// returns the channel id from channel mention
function getChannelFromMention(mention) {
    if (!mention) return false;

    if (mention.startsWith('<#') && mention.endsWith('>')) {
        mention = mention.slice(2, -1);

        return mention;
    }
}

// returns the role id from role mention
function getRoleFromMention(mention) {
    if (!mention) return false;
    
    if (mention.startsWith('<@&') && mention.endsWith('>')) {
        mention = mention.slice(3, -1);
        
        return mention;
    }
}

// escapes all discord markdown to return useful string
function escapeMarkdown(text) {
    let unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1'); // unescape any "backslashed" character
    let escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1'); // escape *, _, `, ~, \
    return escaped;
}

// converts unescaped html-text-string to discord markdown
function convertToDiscord(text) {
    let escaped = escapeMarkdown(text);
    let converted = escaped.replace(new RegExp(ITALIC, 'g'), '*')
                           .replace(new RegExp(BOLD, 'g'), '**')
                           .replace(new RegExp(STRIKETHROUGH, 'g'), '~~')
                           .replace(new RegExp(UNDERLINE, 'g'), '__')
                           .replace(new RegExp(HEADING_START, 'g'), '**__')
                           .replace(new RegExp(HEADING_END, 'g'), '__**');
    return converted;
}

// load all bot settings
function loadSettings() {
    // check for folder/file existence before trying to load
    let totalSettingsLoaded = 0;

    // check if servers folder exists, and if not, to create it
    if (!fs.existsSync(SERVER_SAVE_DIR)) {
        try {
            fs.mkdirSync(SERVER_SAVE_DIR);
        } catch(err) {
            serversFolderAccess = false;
            console.error("Couldn't create `servers` folder to store server settings.");
        }
        console.log('Bot has been activated for the first time, no settings to load for any server.');
    } else { // we have a servers folder to look through
        try {
            // for every file, check text
            fs.readdirSync(SERVER_SAVE_DIR).forEach(file => {
                let settingsLoaded = 0;

                // make sure the file we are reading from follows our settings save postfix
                if (file.endsWith(SAVE_POSTFIX)) {
                    // need to remove the postfix from the file to get the server id
                    let serverId = file.replace(SAVE_POSTFIX, '');

                    // confirm serverId is a real server we are connected to (avoids invalid save files)
                    let serverGuild = client.guilds.cache.get(serverId);
                    if (serverGuild) {
                        let data = fs.readFileSync(SERVER_SAVE_DIR + file, 'utf8');

                        // check to make sure that a specific server's settings hasn't already loaded in
                        if (settings[serverId] && settings[serverId].prefix) {
                            // this shouldn't actually ever happen
                            console.log("Some how the server settings has already loaded in for: " + serverId);
                        } else {
                            // create new server entry with default settings
                            settings[serverId] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

                            // loop through lines until correct setting is found or until end of file
                            let keys = Object.keys(settings[serverId]);
                            let serverOwnerId = serverGuild.ownerID;
                            let serverOwner = serverOwnerId ? syncGetOwnerUsername(serverOwnerId) : null;
                            let serverOwnerUsername = serverOwner ? (serverOwner.username + '#' + serverOwner.discriminator) : null;
                            console.log((serverGuild.name ? ('"' + serverGuild.name + '" (' + serverId + ')') : serverId) + (serverOwnerUsername ? (' [Owner: ' + serverOwnerUsername + ']') : '') + ':');
                            data.toString().split('\n').forEach(function(line, index, arr) {
                                if (index === arr.length - 1 && line === "") return;
                                console.log('\t' + index + ' ' + line);

                                // check and load in settings to specific server id entry
                                for (let i = 0; i < keys.length; i++) {
                                    let key = keys[i];
                                    let keyStart = key + '=';
                                    if (line.startsWith(keyStart)) {
                                        settings[serverId][key] = line.substring(keyStart.length)
                                        settingsLoaded++;
                                    }
                                }
                            });

                            if (settingsLoaded == keys.length) console.log('\tSettings loaded successfully');
                            else if (settingsLoaded) console.log('\tSome settings, but not all, were loaded successfully');
                            else console.log('\tNo settings found in file to load');
                        }

                        totalSettingsLoaded += settingsLoaded;
                    } else {
                        console.error('Tried to load a non-server save file named: ' + file);
                    }
                }
            });
        } catch(err) {
            console.log("Couldn't access the servers folder, or one or more server save files: " + err);
        }
    }
    
    return totalSettingsLoaded;
}

// delete all bot settings
function deleteSettings(serverId) {
    // if there is a server entry in settings object, delete it
    if (settings[serverId]) {
        try {
            delete settings[serverId];
            console.log(`${serverId}: Deleted server settings from object.`);
        } catch(err) {
            console.error(`${serverId}: Couldn't delete server settings from object. Error: ` + err);
        }
    }
    // if there is a settings file for the server, delete it
    let serverSaveFile = SERVER_SAVE_DIR + serverId + SAVE_POSTFIX;
    if (fs.existsSync(serverSaveFile)) {
        try {
            fs.unlinkSync(serverSaveFile);
            console.log(`${serverSaveFile}: Deleted server settings file.`);
        } catch(err) {
            console.error(`${serverSaveFile}: Couldn't delete server settings file. Error: ` + err);
        }
    }
}

// save all bot settings
function saveSettings(serverId) {
    // if the servers folder wasn't created or can't access, prevent saving server settings
    if (serversFolderAccess && serverId) {
        // need to add entry to settings object if there doesn't already appear to be one
        if (!settings[serverId]) {
            settings[serverId] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }

        // create/overwrite existing save file
        let saveString = '';
        let keys = Object.keys(settings[serverId]);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let keyStart = key + '=';
            if (settings[serverId][key]) saveString += keyStart + settings[serverId][key] + '\n';
        }

        // write to file
        try {
            fs.writeFileSync(SERVER_SAVE_DIR + serverId + SAVE_POSTFIX, saveString);
            console.log(`${serverId}: Settings saved successfully.`);
        } catch(err) {
            console.error(`${serverId}: Couldn't save settings. Error: ` + err);
        }
    } else if (!serverId) { // should never get beyond this point
        console.error('No server id was passed into function.');
    } else {
        console.error("No access to servers folder, or it doesn't exist.");
    }
}

// returns channel or author based on if it can send a message in current channel
function msgLocate(msg) {
    if (msg.channel.permissionsFor(msg.guild.me).has(SEND)) return msg.channel;
    else {
        msg.author.send("I don't have permissions to send messages from the channel which you sent the command!");
        return msg.author;
    };
}

// set the prefix for the bot to use
function setPrefix(msg, prefix) {
    let serverId = msg.guild.id;

    // either set or show the prefix
    if (prefix) {
        // don't save when it's not needed
        prefix = prefix.toLowerCase();
        if (prefix == settings[serverId].prefix) {
            msgLocate(msg).send('The bot already has the prefix `' + prefix + '`.');
            return false;
        } else {
            settings[serverId].prefix = prefix;
            saveSettings(serverId);

            // need to update the status to use new prefix
            client.user.setPresence({
                status: 'available',
                activity: {
                    name: PRESENCE_NAME,
                    type: PLAY,
                    url: GITHUB_REPO_URL
                }
            });

            msgLocate(msg).send('The prefix has been set to `' + prefix + '`.');
            return true;
        }
    } else {
        msgLocate(msg).send('The current prefix is `' + settings[serverId].prefix + '`.');
        return false;
    }

}

// BOT FUNCTIONS

// sends and formats article post to discord, or to the feed channel if msg is null
function createArticlePost(msg, post) {
    let serverId = msg ? (msg.guild ? msg.guild.id : null) : null;
    // get the right and formatted information for title and body
    let title = (post.title.replace(/\s/g,'').length > 0) ? htmlToText(post.title, {wordwrap: null}).replace(/\r/g,'').trim() : null;
    let body = htmlToText(post.body, HTML_TO_TEXT).replace(/\r/g,'').trim();
    let sentences = body.split('\n');
    // sometimes the title is in the body
    if (!title) {
        title = sentences.shift();
        // remove the newlines before the next sentence
        while (sentences[0] == '') sentences.shift();
    }
    // get the first sentence and separate from others
    let firstSentence = sentences.shift();
    let moreSentences = '\n' + sentences.join('\n');
    // escape discord markdown symbols
    title = escapeMarkdown(title);
    firstSentence = convertToDiscord(firstSentence);
    moreSentences = convertToDiscord(moreSentences);

    // include the forum link (nice purpose for cases where articles have same slug article link)
    let postForumURL = post.forumLink;

    // start creating the embed
    const embed = new Discord.MessageEmbed()
      .setColor(MAIN_BOT_COLOR)
      .setAuthor(moment(new Date(post.date)).format('DD MMM YYYY').toUpperCase())
      .setTitle('__' + title + '__')
      .setURL(EDN_ARTICLE_URL_PREFIX + post.slug)
      .setFooter(post.date, BOT_FOOTER_IMAGE);

    (async () => {
        // conditionally set image if there is one, else use a specific image
        let imageToCheck;
        let imageExists = true;
        if (post.image && post.image.indexOf(',') != 0) {
            let images = post.image.replace(/^,+/, '').split(',');
            imageToCheck = EDN_ARTICLE_IMG_URL_PREFIX + images[0];
            // only set the image if the file is online and working
            await fetch(imageToCheck).then((response) => {
                if (response.status >= 400 && response.status < 600) {
                  imageExists = false;
                }
            });
        } else imageExists = false;
        if (imageExists) embed.attachFiles([imageToCheck]);
        else embed.attachFiles([EDN_ARTICLE_NO_IMAGE]);

        // need to size differently for posts larger than 2048 characters
        let forumLink = '[Forum Post](' + postForumURL + ')';
        let description = (firstSentence.length > 0) ? ('**' + firstSentence + '**') : '';
        // continue with creating rest of description
        description += (moreSentences.length > 0) ? moreSentences : '';
        description += description ? ('\n\n**' + forumLink + '**') : '';
        const desc = [];
        const endStringTests = ['\n\n', '\n', ' ', ''];
        if (description.length > DESCRIPTION_LENGTH) {
            let firstChunkEnd = -1;
            let endStringTestIndex = 0;
            while (firstChunkEnd <= 0 && endStringTestIndex < endStringTests.length) {
                let endString = endStringTests[endStringTestIndex];
                // need to make sure that the first chunk ends at a double newline, single newline, space, or at max length
                let newDescription = description.substring(0, DESCRIPTION_LENGTH + endString.length);
                firstChunkEnd = newDescription.lastIndexOf(endString);

                // can't go further if firstChunkEnd, wasn't found
                if (firstChunkEnd > 0) {/*
                    // fix the newDescription to match requirements, and get the extended description
                    newDescription = description.substring(0, firstChunkEnd);
                    let extDescription = description.substring(firstChunkEnd + endString.length);

                    desc.push(newDescription);

                    // need to dynamically create the new fields to overcome description/field string length restrictions
                    while (extDescription.length != 0) {
                        // similar chunking like in normal description
                        let newFieldValue = extDescription.substring(0, FIELD_VALUE_LENGTH + endString.length);
                        let iterationChunkEnd = newFieldValue.lastIndexOf(endString);
                        newFieldValue = extDescription.substring(0, iterationChunkEnd);
                        desc.push(newFieldValue);
                        extDescription = extDescription.substring(iterationChunkEnd, iterationChunkEnd + endString.length);
                    }*/ 
desc.push(firstChunkEnd); // TESTING
                }

                endStringTestIndex++;
            }
        } else desc.push(description);

        // conditionally set description if there is one
        embed.setDescription(desc[0]);

        // for each part of description beyond the character limit, include as fields
        if (desc.length > 1) {
            for (let i = 1; i < desc.length; i++) {
                embed.addField('\u200B', desc[i]);
            }
        }

        // send to all discord servers feed channels if not part of msg
        if (!msg) {
            // need to loop through all servers loaded in settings
            let keys = Object.keys(settings);
            for (let i = 0; i < keys.length; i++) {
                // check if server has active feed channel
                serverId = keys[i];
                if (settings[serverId].feedChannel) {
                    let server = client.guilds.cache.get(serverId);
                    let channel = server.channels.cache.get(settings[serverId].feedChannel);
                    let mentionRole = settings[serverId].feedRole ? server.roles.cache.get(settings[serverId].feedRole).toString() : null;
                    // optionally included mention role
                    if (mentionRole) {
                        channel.send(mentionRole, embed).catch(err => {
                            // mention role has been deleted likely
                            console.error(`${serverId}: Has the role been deleted? Error: ` + err);
                        });
                    } else if (channel) {
                        channel.send(embed).catch(err => {
                            // channel has been deleted likely
                            console.error(`${serverId}: Do we have access to the channel? Error: ` + err);
                        });
                    } else if (!channel && server) {
                        console.error(`${serverId}: Has the channel been deleted?`);
                    } else { // !server
                        console.error(`${serverId}: Has the server been deleted?`);
                    }
                }
            }
        } else {
            msgLocate(msg).send(embed).catch(err => {
                console.error(`${serverId}: ` + err);
                return false;
            });
        }
        
        return true;
    })();
}

// fetches all the posts in order and without being empty
async function fetchEdnArticles() {
    let allNewsJSON = await fetch(EDN_JSON_URL);
    // sadly need to sort all the posts first
    let allNews = await allNewsJSON.json();
    allNews.sort((a, b) => (new Date(b.date)) - (new Date(a.date)));
    // then need to remove posts that have no description
    for (let testBodyIndex = allNews.length - 1; testBodyIndex >= 0; testBodyIndex--) {
        if (allNews[testBodyIndex].body.trim() == '') allNews.splice(testBodyIndex, 1);
    }
    
    return allNews;
}

// gets only the very most recent singular post from Elite Dangerous News
function getEdnTopPost(msg) {
    (async () => {
        let allNews = await fetchEdnArticles();

        let post = allNews[0];

        // post new article to channel or feed channel if it was a feed
        createArticlePost(msg, post);
    })();
}

// gets posts from elite dangerous news
// if nothing is entered, it'll grab the newest post(s),
// [for feed] but if a postNode is entered, it'll show old to new posts starting from and skipping postNode
function getEdnPosts(msg, postNode) {
    return (async () => {
        let allNews = await fetchEdnArticles();
        // as long as we don't have a postNode, we need a date to check against
        let checkDate = !postNode ? allNews[0].date : null;
        let post = null;

        // loop through all articles to find oldest with matching date
        const TOTAL_ARTICLES = allNews.length;
        let i = 0; // end index
        let j = 0; // start index
        let matched = false;
        while (!matched && i < TOTAL_ARTICLES) {
            post = allNews[i];
            let peekPost = i < (TOTAL_ARTICLES - 1) ? allNews[i + 1] : null;

            // if we have a date to check, else find postNode
            if (checkDate) {
                let currDate = post.date == checkDate;
                let peekDate = peekPost && (peekPost.date == checkDate);
                // need to include found node
                if (!currDate && peekDate) j = i + 1;
                if (currDate && !peekDate) matched = true;
                else i++;
            } else if (postNode) {
                let currNode = post.nid == postNode;
                let peekNode = peekPost && (peekPost.nid == postNode);
                // need to exclude found node
                if (!currNode && peekNode) j = i;
                if (currNode && !peekNode) matched = true;
                else i++;
            }
        }

        // either start posting matching articles or a note about there being none
        if (matched) {
            let postIndex = 0;
            
            // need to either get a chunch of same date posts, or get posts after matched post
            let noErrors = true;
            if (checkDate) {
                // loop and send all articles that matched the date
                for (let k = i; k >= j; k--) {
                    // must not take a post that has no description
                    let currentPost = allNews[k];
                    if (currentPost.body.trim() != '') {
                        setTimeout(function() {
                            if (!createArticlePost(msg, currentPost)) noErrors = false;
                        }, ALL_POST_DELAY * postIndex);

                        postIndex++;
                    }
                }
            } else if (postNode) {
                // loop and send all articles after the matched date
                for (let k = j; k >= 0; k--) {
                    // must not take a post that has no description
                    let currentPost = allNews[k];
                    if (currentPost.body.trim() != '') {
                        setTimeout(function() {
                            if (!createArticlePost(msg, currentPost)) noErrors = false;
                        }, ALL_POST_DELAY * postIndex);

                        postIndex++;
                    }
                }
            }

            return noErrors;
        } else {
            msgLocate(msg).send('Sorry, but no articles exist for the date you entered.');
            return true;
        }
    })();
}

// sets the role to mention for the feed, role name/mention is required
function setFeedRole(msg, roleArgs) {
    let serverId = msg.guild.id;

    // return if there is no channel set
    if (!settings[serverId] || !settings[serverId].feedChannel) {
        msgLocate(msg).send("Sorry, but there's no channel set for the feed to send messages and mention in.");
        return false;
    }

    // need to get actual roleArg
    let roleArg;
    if (roleArgs.length > 1) {
        roleArg = roleArgs.join(' ');
    } else roleArg = roleArgs[0];

    // check if the role is valid to get a role ID
    let roleId = null;
    if (roleArg) {
        checkRoleMention = getRoleFromMention(roleArg);

        if (checkRoleMention) roleId = checkRoleMention;
        else {
            // if name has spaces, remove the quotes encasing the argument
            if (roleArg.length > 3 &&
                roleArg.startsWith('"') && roleArg.endsWith('"')) roleArg = roleArg.slice(1, -1);
            // continue checking like normal
            if (roleArg.length > 1) {
                // check for name to get role ID
                roleId = msg.guild.roles.cache.find(role => role.name === roleArg).id;

                // else check to see if we were given an id
                if (!roleId) roleId = msg.guild.roles.cache.find(role => role.id === roleArg).id;
            }
        }
    } else roleId = settings[serverId].feedRole; // where the following if will disable it

    if (roleId) {
        let roleResult = true;
        
        if (roleId == settings[serverId].feedRole) {
            settings[serverId].feedRole = null;
            msgLocate(msg).send('The feed role mention is now turned off.');
        } else if (!msg.guild.channels.cache.get(settings[serverId].feedChannel).permissionsFor(msg.guild.me).has(EVERYONE)
          && (roleId == msg.guild.roles.cache.everyone.id || roleId == roleId == msg.guild.roles.cache.here.id)) {
            msgLocate(msg).send("Sorry, but I don't have the permission to mention everyone/here in the currently set channel.");
            roleResult = false;
        } else if (msg.guild.roles.cache.get(roleId).mentionable) {
            settings[serverId].feedRole = roleId;
            msgLocate(msg).send('Automatic feed role mention changed to ' + msg.guild.roles.cache.get(roleId).toString() + '.', {'allowedMentions': { 'users' : []}});
        } else {
            msgLocate(msg).send("Sorry, but that role is currently not mentionable.");
        }

        saveSettings(serverId);
        return roleResult;
    } else {
        if (roleArg) msgLocate(msg).send("Sorry, that's either not a real role or it was entered incorrectly.");
        else msgLocate(msg).send("Sorry, but you need to include the role to be mentioned.");
        return false;
    }
}

// sets the channel for the feed, channel name/mention is optional
function setFeedChannel(msg, channelArg) {
    let serverId = msg.guild.id;
    let channelId = null;

    // check if the channel name is valid to get a channel ID
    if (channelArg) {
        checkChannelMention = getChannelFromMention(channelArg);

        if (checkChannelMention) channelId = checkChannelMention;
        else if (channelArg.length > 1) {
            // check for one word name to get channel ID
            channelId = msg.guild.channels.cache.find(channel => channel.name === channelArg.toLowerCase()).id;

            // else check to see if we were given an id
            if (!channelId) channelId = msg.guild.channels.cache.find(channel => channel.id === channelArg).id;
        }
    } else {
        // use current channel
        channelId = msg.channel.id;
    }

    if (channelId) {
        if (channelId == settings[serverId].feedChannel) {
            settings[serverId].feedChannel = null;
            settings[serverId].feedRole = null;
            
            msgLocate(msg).send('The feed is now turned off.');
        } else if (msg.guild.channels.cache.get(channelId).permissionsFor(msg.guild.me).has(SEND)) {
            settings[serverId].feedChannel = channelId;
            msgLocate(msg).send('Automatic feed channel changed to ' + msg.guild.channels.cache.get(channelId).toString() + '.');
        } else {
            msgLocate(msg).send("Sorry, but I don't have the permission to send messages in that channel.");
        }

        saveSettings(serverId);
        return true;
    } else {
        msgLocate(msg).send("Sorry, that's either not a real channel or it was entered incorrectly.");
        return false;
    }
}

// this will check for new posts, and update the newest post file information
function checkFeed() {
    (async () => {
        // start checking for new posts
        let allNews = await fetchEdnArticles();
        let post = allNews[0];

        let newPostAvailable = true;
        let checkPostNode = post.nid;

        // check for file existence before trying to load
        let data;
        let filePostNode;
        try {
            data = fs.readFileSync(NEWEST_POST_FILE, 'utf8');

            // check first line of file with string of feed
            filePostNode = data.toString().replace(/\n$/, '');
            // check to make sure we actually have a new post
            if (checkPostNode == filePostNode) newPostAvailable = false;
        } catch(err) {
            console.log('Feed file will be initialized.');
        }

        // if there's still a new post available, save it
        if (newPostAvailable) {
            console.log(`Found a new post from Elite Dangerous News at: ${ED_NODE_URL_PREFIX}${checkPostNode}`);

            // get post(s) after the last known post (via node compare) from json file
            if (getEdnPosts(null, filePostNode)) {
                // write to file
                try {
                    fs.writeFileSync(NEWEST_POST_FILE, checkPostNode + '\n');
                } catch(err) {
                    console.error(err)
                }
            }
        } else console.log(`No new post found, latest is still at: ${ED_NODE_URL_PREFIX}${checkPostNode}`);

        return newPostAvailable;
    })();
}

// MAIN START

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // load settings in first
    loadSettings();

    // set status after settings are loaded in
    client.user.setPresence({
        status: 'available',
        activity: {
            name: PRESENCE_NAME,
            type: PLAY,
            url: GITHUB_REPO_URL
        }
    });
    
    // start interval checking of the JSON feed to update channel
    checkFeed();
    setInterval(function() {
        checkFeed();
    }, FEED_INTERVAL_SPEED);
    console.log(`Feed checker interval started.`);
});

// joining a server
client.on("guildCreate", guild => {
    console.log(`Joined a new guild: ${guild.name}`);

    // need to create entry in settings object
    saveSettings(guild.id);

    // set status
    client.user.setPresence({
        status: 'available',
        activity: {
            name: PRESENCE_NAME,
            type: PLAY,
            url: GITHUB_REPO_URL
        }
    });
});
// removed from a server
client.on("guildDelete", guild => {
    console.log(`Left a guild: ${guild.name}`);

    // need to delete entry in settings object, and delete server settings file
    deleteSettings(guild.id);

    // set status
    client.user.setPresence({
        status: 'available',
        activity: {
            name: PRESENCE_NAME,
            type: PLAY,
            url: GITHUB_REPO_URL
        }
    });
})

// command functions should be in here
client.on('message', msg => {
    if (msg.author.bot) return; // don't let bots control our bot!
    let serverId = msg.guild.id;

    // check for prefix
    let before = msg.content.split(/ +/g).shift();
    let mentioned = getUserFromMention(before);
    let hasPrefix = before.toLowerCase() === settings[serverId].prefix;
    let hasMention = mentioned && msg.mentions.users.first() == client.user;
    if (hasPrefix || hasMention) {
        // useful information for commands, for the mention the 3 is for the '<@!>' characters
        const args = hasPrefix ? msg.content.slice(settings[serverId].prefix.length).trim().split(/ +/g)
                               : msg.content.slice(mentioned.id.length + 4).trim().split(/ +/g);  
        const command = args.shift().toLowerCase();

        // <===== COMMANDS HERE =====> //

        // HELP
        if (command === 'help') {
            console.log(`${serverId}: Executed help command`);
            const embed = new Discord.MessageEmbed()
              .setColor(MAIN_BOT_COLOR)
              .setAuthor(BOT_NAME + ' v' + version)
              .setTitle('__Commands__')
              .setDescription(`To run a command: \`${settings[serverId].prefix} <command>\`\n\n` +
                `**help** - Brings up this help page\n` +
                `**ping** - Gets the ping time in milliseconds\n` +
                `**newest** or **latest** - Gets the latest post(s)\n` +
                `**top** - Works like newest, but only grabs the single most recent news post\n` +
                `**feedinfo** - Shows if the feed is on, what channel it's set to, and if a role is set to be mentioned`)
              .setThumbnail(BOT_THUMBNAIL_IMAGE)
              .setFooter("Mention a mod/admin/owner of the server if there are problems with this bot.", BOT_FOOTER_IMAGE);

            // need to conditionally show admin commands            
            if (msg.member.hasPermission(ADMIN)) {
                embed.addField('__Admin Commands__',
                  `**feedchannel** [name / id / mention] - Sets the feed channel or toggles it off, and no arguments uses the channel command was sent in\n` +
                  `**feedrole** [name (case sensitive) / id / mention] - Sets the role to mention or toggles it off, no arguments turns off the role mention\n` +
                  `**prefix** [no-whitespace-string] - Sets the prefix for the bot, and no arguments shows the current prefix`);
            }

            // need this field added last
            embed.addField(`__Bot Information__`,
              `Creator: **[${author}](${AUTHOR_URL})**\n` +
              `Source Code: **[GitHub Repo](${GITHUB_REPO_URL})** (${license})\n` +
              `Donate: **[PayPal](${PAYPAL_URL})**`);
        
            msgLocate(msg).send(embed);
        }

        // PING
        else if (command === 'ping') {
            console.log(`${serverId}: Executed ping command`);
            msgLocate(msg).send("Pinging...").then((msg)=> {
                msg.edit("Still pinging...").then((msg)=> {
                    msg.edit("Pong! `" + (msg.editedTimestamp - msg.createdTimestamp) + "ms`");
                })
            })
        }

        // <===== BOT COMMANDS HERE =====> //

        // NEWEST / LATEST
        else if (command === 'newest' || command == 'latest') {
            console.log(`${serverId}: Executed newest/latest command`);
            getEdnPosts(msg);
        }

        // TOP
        else if (command == 'top') {
            console.log(`${serverId}: Executed top command`);
            getEdnTopPost(msg);
        }
        
        // FEED INFO
        else if (command === 'feedinfo') {
            console.log(`${serverId}: Executed feedinfo command`);
            msgLocate(msg).send(
                settings[serverId].feedChannel
                ? ('The feed is currently set to send new posts to '
                  + msg.guild.channels.cache.get(settings[serverId].feedChannel).toString()
                  + (settings[serverId].feedRole ? (', and mention the ' + msg.guild.roles.cache.get(settings[serverId].feedRole).toString() + ' role') : '') + '.')
                : 'The feed is currently turned off.', settings[serverId].feedRole ? {'allowedMentions': { 'users' : []}} : null);
        }

        // <===== ADMIN ONLY COMMANDS =====> //

        // FEED CHANNEL
        else if (command === 'feedchannel') {
            if (!msg.member.hasPermission(ADMIN)) {
                console.log(`User doesn't have permission for command`);
                msgLocate(msg).send(NO_PERMISSION);
                return;
            }
            console.log(`${serverId}: Executed feedchannel command`);
            setFeedChannel(msg, args[0]);
        }

        // FEED ROLE
        else if (command === 'feedrole') {
            if (!msg.member.hasPermission(ADMIN)) {
                console.log(`User doesn't have permission for command`);
                msgLocate(msg).send(NO_PERMISSION);
                return;
            }
            console.log(`${serverId}: Executed feedrole command`);
            setFeedRole(msg, args);
        }

        // PREFIX
        else if (command === 'prefix') {
            if (!msg.member.hasPermission(ADMIN)) {
                console.log(`User doesn't have permission for command`);
                msgLocate(msg).send(NO_PERMISSION);
                return;
            }
            console.log(`${serverId}: Executed prefix command`);
            setPrefix(msg, args[0]);
        }

        // <===== END OF COMMANDS =====> //

        // NOT A COMMAND, or NO PERMISSION
        else {
            console.log(`${serverId}: Invalid command entered: ${command}`);
            msgLocate(msg).send("Sorry, but that's not a command, please look at the help page.");
        }
    } 
}); 

// MAIN END

client.login(config.BOT_TOKEN);
