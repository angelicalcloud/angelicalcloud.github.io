/*************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2010 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/


//************************GLOBALS**************************

if (typeof(jQM) === "undefined") {
	jQM = {};
}

jQM.Utils = {
	//Booleans to check for resources and guard against redundancy.
	hasJqmJavascriptSource: false,
	hasJqmJquerySource: false,
	hasJqmCSSSource: false,
	hasJqmStructureSource: false,
	hasJqmThemeSource: false,
	
	//Preference strings
	prefStrings: {}
};

jQM.Utils.prefStrings.resourceStrings = {
	jqSrcPref: null,
	jqLibSrcPref: null, 
	jqImgSrcPref: null, 
	jsSrcPref: null, 
	cssSrcPref: null,
	jqDestPref: null, 
	jsDestPref: null,
	cssDestPref: null,
	mainCSSFile: null
};

//Markup variables
var markupArr;					//Shared temp array to hold string fragments of widget markup.
var widgetMarkup, widgetId;		//Strings containing actual markup and ID of widget.

//******************* API **********************

//--------------------------------------------------------------------
// FUNCTION:
//   addMarkup
//
// DESCRIPTION:
//	 Wrapper function for checking validity of insertion point and inserting
//	 markup if valid. Alerts error message to get warning window rather than
//	 error window.
//--------------------------------------------------------------------
function addMarkup() {
	var errMsg = checkSelection();
   
	//Is the insertion point valid?
	if (errMsg == "") {
		insertMarkup();
	} else {
		alert(errMsg);
	}
}

//--------------------------------------------------------------------
// FUNCTION:
//   checkSelection
//
// DESCRIPTION:
//   Check to see if selection is in a valid place. Current
//	 validation requires selection to be within any <div> with data-role= "page".
//
// RETURNS:
//   String containing error message if position is invalid.
//--------------------------------------------------------------------
function checkSelection() {
	//Reusable variables
	var i, len, node;
   
	var dom = dw.getDocumentDOM();
	var curPos = dom.getSelection()[0];
	var jqmElements = dom.getElementsByAttributeName("data-role");
	len = jqmElements.length;                                         
   
	var attr, offsetArr;
	var errMsg = "";
   
	offsetArr = [];
	errMsg = dw.loadString("Commands/jQM/generic/alert/pageDivError");
	for (i = 0; i < len; i ++) {
		node = jqmElements[i];
		attr = node.getAttribute("data-role");
		if (attr == "page") {
			offsetArr.push(node);
		}
	}
	len = offsetArr.length;
   
	//Are there any good <div>'s?
	if (len > 0) {
		var id;

		//Check to see if cursor is inside any of them.
		for (i = 0; i < len; i ++) {
			node = dom.nodeToOffsets(offsetArr[i]);
			if (curPos > node[0] && curPos < node[1]) {
				return "";
			}
		}
	}
	return errMsg;
}

//--------------------------------------------------------------------
// FUNCTION:
//   insertMarkup
//
// DESCRIPTION:
//   Inserts markup at current selection point. Assumes that current position
//	 is a valid point of insertion.
//--------------------------------------------------------------------
function insertMarkup() {
	var dom = dw.getDocumentDOM();
   
	//Current position of the cursor               
	var curPos = dom.getSelection()[0];
	var docEl = dom.documentElement;
	var docElOuterHTML = docEl.outerHTML;
	docEl.outerHTML = docElOuterHTML.substring(0, curPos) + widgetMarkup + docElOuterHTML.substring(curPos);

	if (!checkForResources(dom)) {
		//Add resources if we're missing some
		addResources(dom);
	}
	highlightNode();
}

//--------------------------------------------------------------------
// FUNCTION:
//   highlightNode
//
// DESCRIPTION:
//   Highlight the main inserted widget markup.
//--------------------------------------------------------------------
function highlightNode() {
	var dom = dw.getDocumentDOM();
	var page, i, offsets;
	
	//Node type to scrape through.
	var nodeType = "div";

	//Trim down DOM scraping by isolating special cases
	if (widgetId.indexOf("jQMList") != -1) {
		nodeType = "ul";
	} else if (widgetId.indexOf("jQMLinkBtn") != -1) {
		nodeType = "a";
	} else if (widgetId.indexOf("jQMButtonBtn") != -1) {
		nodeType = "button";
	} else if (widgetId.indexOf("jQMInputBtn") != -1) {
		nodeType = "input";
	} else if (widgetId.indexOf("Ordered") != -1) {
		nodeType = "ol";
	}
	
	var theNodes = dom.getElementsByTagName(nodeType);
	var len = theNodes.length;

	for (i = 0; i < len; i ++) {
		page = theNodes[i];
		if (page.getTranslatedAttribute('transId') == widgetId) {
			offsets = dom.nodeToOffsets(page);
			dom.setSelection(offsets[0], offsets[1]);	
		}
	}
}

//--------------------------------------------------------------------
// FUNCTION:
//   checkForResources
//
// DESCRIPTION:
//   Checks the elements of <head> to see if any of the jQuery Mobile scripts are already included.
//
// ARGUMENTS:
//   dom - DOM object of the user's current page.
//
// RETURNS:
//   Boolean of whether all of the required files are present.
//--------------------------------------------------------------------
function checkForResources(dom) {
   var utils = jQM.Utils;
   
	//Reset booleans.
	utils.hasJqmJavascriptSource = utils.hasJqmJquerySource =
	utils.hasJqmCSSSource = utils.hasJqmStructureSource =
	utils.hasJqmThemeSource = false;
   
	var srcNodes = srcChecker(dom),
		hasCSS = utils.hasJqmCSSSource || utils.hasJqmStructureSource,

		haveAllFiles = utils.hasJqmJquerySource && utils.hasJqmJavascriptSource && hasCSS,
		cssTypeValue = dw.getPreferenceString(PREF_SECTION, PREF_CSS_TYPE, PREF_CSS_SPLIT),
		splitCSS = cssTypeValue == PREF_CSS_SPLIT;
	
	//Need to account for when jQM source settings don't match current page.
	if (splitCSS && utils.hasJqmStructureSource) {
		haveAllFiles = haveAllFiles && utils.hasJqmThemeSource;
	}
	
	return haveAllFiles;
}

//--------------------------------------------------------------------
// FUNCTION:
//   srcChecker
//
// DESCRIPTION:
//   Scrapes the <head> looking for <script> and <link> with the correct jQM references
//	 and updates if they exist, in addition to returning an array with references to the
// 	 node (For deletion).
//
// ARGUMENTS:
//   dom - DOM object of the user's current page.
//
// RETURNS:
//   Array of the nodes matching the jQuery Mobile resources.
//--------------------------------------------------------------------
function srcChecker(dom) {
	var head = dom.getElementsByTagName("head")[0];
	var headChildren = head.childNodes;
	var len = headChildren.length;
	
	var i, src, node;
	var srcArr, fileName, coreFile;
	var srcNodes = [];

	for (i = 0; i < len; i ++) {
		node = headChildren[i];
		
		//Skip over comment node.
		if (node.nodeType != document.COMMENT_NODE) {
			src = node.getAttribute("src");
			//Do we have a JS file?
			if (src) {
				srcArr = src.split("/");
				fileName = srcArr[srcArr.length-1];
			} else {
				//What about the CSS file?
				src = node.getAttribute("href");
	
				if (src) {
					srcArr = src.split("/");
					fileName = srcArr[srcArr.length-1];
				} else {
					//No src, move onto next node.
					continue;
				}
			}
		
			//Search for remote script tags as workaround to duplicate insertion.
			var utils = jQM.Utils;
			if (validFileName(fileName, "js")) {
				utils.hasJqmJavascriptSource = true;
				srcNodes.push(node);
			} else if (validFileName(fileName, "jq")) {
				utils.hasJqmJquerySource = true;
				srcNodes.push(node);
			} else {
				//CSS file
				var cssTypeValue = dw.getPreferenceString(PREF_SECTION, PREF_CSS_TYPE, PREF_CSS_SPLIT);
				
				//Pick main CSS file based off chosen CSS type.
				var splitCSS = cssTypeValue == PREF_CSS_SPLIT;
		   
			   if (validFileName(fileName, 'css')) {
					utils.hasJqmCSSSource = true;
					srcNodes.push(node);
				} else if (validFileName(fileName, 'structure')) {
					utils.hasJqmStructureSource = true;
					srcNodes.push(node);
				} else {
					//Some CSS file other than core/structure.
					if (splitCSS) {
						//Assume this is some theme file
						utils.hasJqmThemeSource = true;
						srcNodes.push(node);
					}
				}
			}
		}
	}

	return srcNodes;	
}

//--------------------------------------------------------------------
// FUNCTION:
//   idCheck
//
// DESCRIPTION:
//   Check the validity of the ID.
//
// ARGUMENTS:
//   id - String consisting of the ID of an element.
//
// RETURNS:
//   Boolean determining if the ID is W3C valid or not.
//--------------------------------------------------------------------
function idCheck(id) {
	var regExp = new RegExp('[a-zA-Z][\\w\-\:\.]*');
	return (regExp.exec(id) == id);
}

//--------------------------------------------------------------------
// FUNCTION:
//   addResources
//
// DESCRIPTION:
//   Writes out any missing resource tags in the document. Uses boolean checks as a workaround to prevent
//	 adding any duplicate tags.
//
// ARGUMENTS:
//   dom - DOM object of the user's current page.
//--------------------------------------------------------------------
function addResources(dom) {
	var assets = [];
	var obj = {}; 
	var linkTypeValue = dw.getPreferenceString(PREF_SECTION, PREF_LINK_TYPE, PREF_LINK_REMOTE);
	var cssTypeValue = dw.getPreferenceString(PREF_SECTION, PREF_CSS_TYPE, PREF_CSS_SPLIT);
	var isSplitCSS = cssTypeValue == PREF_CSS_SPLIT;
	
	var jsDest, cssDest, jqDest, themeDest;
	var jsSrc, cssSrc, jqSrc, themeSrc;
	var blank = "";

	linkTypeValue = parseInt(linkTypeValue);
	switch (linkTypeValue) {
		case PREF_LINK_REMOTE:
			jsSrc = dw.getPreferenceString(PREF_SECTION, REMOTE_JS, jqmJavascriptSource);
			jqSrc = dw.getPreferenceString(PREF_SECTION, REMOTE_JQ, jqmJquerySource);
			
			cssDest = blank;
			jsDest = blank;
			jqDest = blank;
			
			var cssPref, cssDef;
			
			//Add theme files if present.
			if (isSplitCSS) {
				//Change main CSS file reference.
				cssPref = REMOTE_STRUCTURE;
				cssDef = jqmStructureSource;
				
				themeSrc = dw.getPreferenceString(PREF_SECTION, REMOTE_THEME, jQMThemeSource);
				themeDest = blank;
				
				//Add CSS reference to markup.
				if (!jQM.Utils.hasJqmThemeSource) {
					obj.srcURL = themeSrc;
					obj.refType = "link";
					obj.destURL = themeDest;
					obj.useDefaultFolder = false;
					obj.documentRelative = false;
					assets.push(obj);
				}
			} else {
				cssPref = REMOTE_CSS;
				cssDef = jqmCSSSource;
			}
			
			//Set CSS file.
			cssSrc = dw.getPreferenceString(PREF_SECTION, cssPref, cssDef);
			
			break;
		case PREF_LINK_LOCAL:
			//Default file paths.
			var libPath = dw.getConfigurationPath() + "/" + assetDir;
			var locJS = libPath + localJS;
			var cssFile = isSplitCSS ? localStructureCSS : localCSS;
			var locCSS = libPath + cssFile;
			var locJQ = libPath + localJQ;
			var iconDir = libPath + localIconDir;
			
			//Setup correct pref strings.
			var resourcePrefs = jQM.Utils.prefStrings.resourceStrings;
			var cssType = isSplitCSS ? SPLIT_CSS : ALL_CSS;
			setPrefStrings(cssType);
			
			var libSrc = dw.getPreferenceString(PREF_SECTION, resourcePrefs.jqLibSrcPref, libPath);
			var iconSrc = libSrc;
			if (libSrc[libSrc.length-1] != "/") {
				iconSrc += "/";
			}
			iconSrc += localIconDir;
			
			//Get preferences
			jsSrc = dw.getPreferenceString(PREF_SECTION, resourcePrefs.jsSrcPref, locJS);
			cssSrc = dw.getPreferenceString(PREF_SECTION, resourcePrefs.cssSrcPref, locCSS);
			jqSrc = dw.getPreferenceString(PREF_SECTION, resourcePrefs.jqSrcPref, locJQ);
			jsDest = dw.getPreferenceString(PREF_SECTION, resourcePrefs.jsDestPref, jqmDir+localJS);
			cssDest = dw.getPreferenceString(PREF_SECTION, resourcePrefs.cssDestPref, jqmDir+cssFile);
			jqDest = dw.getPreferenceString(PREF_SECTION, resourcePrefs.jqDestPref, jqmDir+localJQ);
			var iconDest = dw.getPreferenceString(PREF_SECTION, resourcePrefs.jqImgSrcPref, jqmDir+localIconDir);
			
			//Check file validity, defaulting to defaults if source is invalid. (For the case of quick insertion, no dialog)
			if (!dwscripts.isFile(jsSrc)) {
				jsSrc = libPath + localJS;
			}
			if (!dwscripts.isFile(cssSrc)) {
				cssSrc = libPath + localCSS;
			}
			if (!dwscripts.isFile(jqSrc)) {
				jqSrc = libPath + localJQ;
			}
			if (!dwscripts.isFolder(iconSrc)) {
				iconSrc = iconDir;
			}

			obj.srcURL = iconSrc;
			obj.refType = "";
			obj.destURL = iconDest;
			obj.useDefaultFolder = false;
			obj.documentRelative = false;
			assets.push(obj);
			
			//Add theme file
			if (isSplitCSS) {
				var themeDef = libPath+localThemeCSS;
				var themeSrc = dw.getPreferenceString(PREF_SECTION, PREF_CSS_FILE, themeDef);
				var destFolder = getFileName(libSrc, 'folder') + '/';
				var cssName = getFileName(themeSrc);
				themeDest = destFolder + cssName;
				
				//Check file validity.
				if (!dwscripts.isFile(themeSrc)) {
					//Grab default if not valid.
					themeSrc = themeDef;
				}
				
				//Add CSS reference to markup.
				if (!jQM.Utils.hasJqmThemeSource) {
					obj = {};
					obj.srcURL = themeSrc;
					obj.refType = "link";
					obj.destURL = themeDest;
					obj.useDefaultFolder = false;
					obj.documentRelative = false;
					assets.push(obj);
				}
			}
			
			break;
	}
   
	if (!jQM.Utils.hasJqmCSSSource) {
		obj = {};
		obj.srcURL = cssSrc;
		obj.refType = "link";
		obj.destURL = cssDest;
		obj.useDefaultFolder = false;
		obj.documentRelative = false;
		assets.push(obj);
	}

	if (!jQM.Utils.hasJqmJquerySource) {
		obj = {};               
		obj.srcURL = jqSrc;
		obj.refType = "javascript";
		obj.destURL = jqDest;
		obj.useDefaultFolder = false;
		obj.documentRelative = false;  
		assets.push(obj);
	}
   
	if (!jQM.Utils.hasJqmJavascriptSource) {
		obj = {};
		obj.srcURL = jsSrc;
		obj.refType = "javascript";
		obj.destURL = jsDest;
		obj.useDefaultFolder = false;
		obj.documentRelative = false;
		assets.push(obj);
	}
	
	dom.copyAssets(assets);
}

//--------------------------------------------------------------------
// FUNCTION:
//   delFunc
//
// DESCRIPTION:
//   Function handler to do cleanup of resources upon removal of the last jQM-related 
//	 element upon sync between the two views.
//
// ARGUMENTS:
//   dom - DOM object of the user's current page.
//--------------------------------------------------------------------
function delFunc(dom) {
	return function(e) {
		var eles = dom.getElementsByAttributeName("data-role");
		var numEles = eles.length;

		//Is this the last jQM-related element?
		if (numEles == 1) {
			var srcNodes = srcChecker(dom);
			var len = srcNodes.length;
			
			var node;
			for (var i = 0; i < len; i ++) {
				node = srcNodes[i];
				removeNode(node, dom);
			}
		}
	}
}

//--------------------------------------------------------------------
// FUNCTION:
//   validFileName
//
// DESCRIPTION:
//   Given a file name and type, checks to see if it conforms to our pattern.
//
// ARGUMENTS:
//   fileName - String consisting of the name of the file.
//	 fileType - String indicating which type of file to match against.
//	 minified - Boolean indicating if we are looking for the minified version of the file.
//
// RETURNS:
//   Boolean of whether or not the file name matches the pattern for the file type.
//--------------------------------------------------------------------
function validFileName(fileName, fileType, minified) {
	/** Base Name + [Version Number] + [Minified] + ExtensionName 
	  * Bracketed items are optional, version number begins with '-' and accounts for alpha/beta versions. */
	var fileExt;
	var fileBase = "jquery";
	var mobileBase = ".mobile";
	var minFile = minified ? ".min" : "";
	var cssType = "";
	
	switch(fileType) {
		case 'jq':
			mobileBase = "";
			fileExt = ".js";
			break;
		case 'structure':
			cssType = '.' + fileType;
			fileExt = ".css";
			break;
		default:
			fileExt = '.' + fileType;
	}
	
	var regExpBase = ".*";
	var re = fileBase + mobileBase + cssType + regExpBase + minFile + fileExt;
	var regExp = new RegExp(re, 'g');
	
	return regExp.test(fileName);
}

//--------------------------------------------------------------------
// FUNCTION:
//   getUniqueNameForTag
//
// DESCRIPTION:
//   Given a tag type and a base name, checks tags of the same type
//   to determine a unique name.  Unique names are formed by adding a
//   count to the base name only if provided name is not already taken.
//	 Minor modification of dwscripts.getUniqueNameForTag
//
// ARGUMENTS:
//   tagType - string - the type of tags to search for matching names
//   baseName - string - the root variable name, to which the count
//     will be added.
//
// RETURNS:
//   string
//--------------------------------------------------------------------

function getUniqueNameForTag(tagType, baseName) {
  var dom = dw.getDocumentDOM();
  var tagCounter = 1;
  var possName = baseName;

  var objArray = dom.body.getElementsByTagName(tagType.toUpperCase());
  var numObj = objArray.length;
  var objNames = [];
  var objName;

  if (numObj > 0) {
    // create the list of object names
    for (var i=0; i < numObj; i++) {
      objName = objArray[i].getAttribute("name");
      if (objName) {
        objNames.push(objName);
      }

      objName = objArray[i].getAttribute("id");
      if (objName) {
        objNames.push(objName);
      }
    }
	
	//Check for baseName usage first, before adding on number.
	if (dwscripts.findInArray(objNames, baseName) != -1) {
		possName += tagCounter;
		while (dwscripts.findInArray(objNames,possName) != -1) {
		  tagCounter++;
		  possName = baseName+tagCounter;
		}
	}
  }

  return possName;
}

//--------------------------------------------------------------------
// FUNCTION:
//   setPrefStrings
//
// DESCRIPTION:
//   Sets the preference strings in the resourcePrefs object to match the
//	 preference string corresponding to the CSS type chosen by the user.
//
// ARGUMENTS:
//   type - string - The CSS type chosen.
//
// RETURNS:
//   string
//--------------------------------------------------------------------
function setPrefStrings(type) {
	var resourcePrefs = jQM.Utils.prefStrings.resourceStrings;
	
	if (type == SPLIT_CSS) {
		resourcePrefs.jqSrcPref = PREF_SPLIT_JQ_JS_SRC;
		resourcePrefs.jsSrcPref = PREF_SPLIT_JQM_JS_SRC;
		resourcePrefs.cssSrcPref = PREF_SPLIT_JQM_CSS_SRC;
		resourcePrefs.jqLibSrcPref = PREF_SPLIT_JQLIB_SOURCE_FOLDER;
		resourcePrefs.jqImgSrcPref = PREF_SPLIT_ICON_DIR;
		
		resourcePrefs.jqDestPref = PREF_SPLIT_JQ_JS_DEST;
		resourcePrefs.jsDestPref = PREF_SPLIT_JQM_JS_DEST;
		resourcePrefs.cssDestPref = PREF_SPLIT_JQM_CSS_DEST;
		
		resourcePrefs.mainCSSFile = localStructureCSS;
	} else {
		resourcePrefs.jqSrcPref = PREF_JQ_JS_SRC;
		resourcePrefs.jsSrcPref = PREF_JQM_JS_SRC;
		resourcePrefs.cssSrcPref = PREF_JQM_CSS_SRC;
		resourcePrefs.jqLibSrcPref = PREF_JQLIB_SOURCE_FOLDER;
		resourcePrefs.jqImgSrcPref = PREF_ICON_DIR;
		
		resourcePrefs.jqDestPref = PREF_JQ_JS_DEST;
		resourcePrefs.jsDestPref = PREF_JQM_JS_DEST;
		resourcePrefs.cssDestPref = PREF_JQM_CSS_DEST;
		
		resourcePrefs.mainCSSFile = localCSS;
	}
}

//--------------------------------------------------------------------
// FUNCTION:
//   getFileName
//
// DESCRIPTION:
//   Obtain the name of the file, given a URL or filepath.
//
// ARGUMENTS:
//   fileName - String containing the name of the absolute file.
//	 fileType - String containing the type of file.
//
// RETURNS:
//   String of just the file name.
//-------------------------------------------------------------------- 
function getFileName(fileName, fileType) {
	var fileArr = fileName.split('/');
	var indexOffset = fileType == 'folder' ? 2 : 1;
	
	return fileArr[fileArr.length-indexOffset];
}