/*
  -- ***** BEGIN LICENSE BLOCK *****
  -   Version: MPL 1.1/GPL 2.0/LGPL 2.1
  -
  - The contents of this file are subject to the Mozilla Public License Version
  - 1.1 (the "License"); you may not use this file except in compliance with
  - the License. You may obtain a copy of the License at
  - http://www.mozilla.org/MPL/
  - 
  - Software distributed under the License is distributed on an "AS IS" basis,
  - WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
  - for the specific language governing rights and limitations under the
  - License.
  -
  - The Original Code is FullContact 4 Thunderbird.
  -
  - The Initial Developer of the Original Code is
  - Daniel Thomas.
  - Portions created by the Initial Developer are Copyright (C) 2011
  - the Initial Developer. All Rights Reserved.
  -
  - Contributor(s):
  -
  - Alternatively, the contents of this file may be used under the terms of
  - either the GNU General Public License Version 2 or later (the "GPL"), or
  - the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
  - in which case the provisions of the GPL or the LGPL are applicable instead
  - of those above. If you wish to allow use of your version of this file only
  - under the terms of either the GPL or the LGPL, and not to allow others to
  - use your version of this file under the terms of the MPL, indicate your
  - decision by deleting the provisions above and replace them with the notice
  - and other provisions required by the GPL or the LGPL. If you do not delete
  - the provisions above, a recipient may use your version of this file under
  - the terms of any one of the MPL, the GPL or the LGPL.
  - 
  - ***** END LICENSE BLOCK ***** --
 */

if (!com)
	var com = {};
if (!com.networklighthouse)
	com.networklighthouse = {};
if (!com.networklighthouse.rm4tb)
	com.networklighthouse.rm4tb = {};

com.networklighthouse.rm4tb = function() {
	var pub = {};
	pub.gXMLHttpRequest;
	pub.rm_email;
	pub.rm_emailHash;
	pub.rm_cacheDays;
	pub.rm_prefManager = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefBranch);

	// using this instead
	pub.rm_cacheManager = pub.rm_prefManager;
	// XXX MUST use a proper data store, either Address book or db file.
	pub.addressBookURI = pub.rm_prefManager
			.getCharPref("mail.collect_addressbook");
	pub.addressbook = null;

	pub.prefImageSrc = pub.rm_prefManager
			.getCharPref("extensions.rm4tb.imagePrefSrc");
	pub.rm_messenger = Components.classes['@mozilla.org/messenger;1']
			.createInstance();

	pub.obj_dump = function(arr, level) {
		var dumped_text = "";
		if (!level)
			level = 0;

		// The padding given at the beginning of the line.
		var level_padding = "";
		for ( var j = 0; j < level + 1; j++)
			level_padding += "    ";

		if (typeof (arr) == 'object') { // Array/Hashes/Objects
			for ( var item in arr) {
				var value = arr[item];
				if (typeof (value) == 'object') { // If it is an array,
					dumped_text += level_padding + "'" + item + "' ...\n";
					dumped_text += dump(value, level + 1);
				} else {
					dumped_text += level_padding + "'" + item + "' => \""
							+ value + "\"\n";
				}
			}
		} else { // Stings/Chars/Numbers etc.
			dumped_text = "===>" + arr + "<===(" + typeof (arr) + ")";
		}
		dump(dumped_text);
	}

	pub.rm_getlstr = function(name) {
		name = "rm4tb." + name;
		value = document.getElementById("strings_rm4tb").getString(name);
		return (value);
	}

	pub.loadRapboxStatus = function(rm_email) {
		var key = pub.rm_prefManager.getCharPref("extensions.rm4tb.key");
		var debug = pub.rm_prefManager.getBoolPref("extensions.rm4tb.test");

		var proto = "https";
		var url = null;

		pub.gXMLHttpRequest = new XMLHttpRequest();
		pub.gXMLHttpRequest.onload = pub.updateRMboxStatus;
		pub.gXMLHttpRequest.overrideMimeType('application/json');

		if (debug == true) {
			url = "chrome://rm4tb/content/test.json";
		} else {
			url = proto + "://api.fullcontact.com/v1/person.json?email="
					+ rm_email + "&apiKey=" + key + "&timeoutSeconds=30";
		}
		debugger;
		// alert("CALLING "+url);
		pub.gXMLHttpRequest.rm_email = rm_email;
		pub.gXMLHttpRequest.open("GET", url);
		pub.gXMLHttpRequest.send(null);
	}

	pub.rm_backup = function() {
		var os = Components.classes["@mozilla.org/observer-service;1"]
				.getService(Components.interfaces.nsIObserverService);
		os.addObserver(pub.messageShowListener, "MsgMsgDisplayed", false);

	}

	pub.messageShowListener = {
		observe : function(aSubject, aTopic, aData) {
			// this is the non-steel method, to be retired when steel is
			// finished
			pub.rm_UpdateMessageHeaders(aData);
		}
	}
	
	pub.rm_UpdateHeadersHdr=function(aMsgHdr){
		debugger;
		pub.rm_UpdateMessageHeadersBdy(aMsgHdr);
	}

	pub.rm_UpdateMessageHeaders = function(aData) {
		debugger;
		var msg = messenger.msgHdrFromURI(aData);
		pub.rm_UpdateMessageHeadersBdy(msg);
	}
	
	pub.rm_UpdateMessageHeadersBdy=function(msg){
		debugger;
		from = msg.author;
		// facebook sends funny emails, reply-to address is normally more
		// interesting
		if (from.indexOf("@facebookmail.com") >= 0) {
			debugger;
			from = msg.replyto
			// from = currentHeaderData["reply-to"].headerValue;
		}
		// `+` in email addresses is valid, but we want to drop anything between
		// + and @
		if (from.indexOf("+") >= 0) {
			from = from.replace(/(.*)\+.*@(.*)/, "$1@$2");
		}

		from = from.replace(/.*\</g, "");
		from = from.replace(/\>/g, "");
		from = from.toLowerCase();
		rm_email = from;
		// rm_emailHash=pub.sha1Hash(rm_email.toLowerCase());

		pub.rm_cleanup();
		rm_cacheDays = pub.rm_prefManager
				.getIntPref("extensions.rm4tb.cacheDays");
		if (rm_cacheDays > 0) { // doCache var day;
			var cache;
			var dat = new Date();
			var minutes = 1000 * 60;
			var hours = minutes * 60;
			var days = hours * 24;
			var today = Math.floor(dat.getTime() / days);
			var day;
			try {
				var card = this.addressbook.cardForEmailAddress(rm_email);
				if (card == null) {
					day = 0;
				} else {
					day = parseInt(card.getProperty("RM_CACHED_ON", 0));
				}
			} catch (err) {
				day = 0;
			}
			if (day + rm_cacheDays < today) {
				window.setTimeout(pub.loadRapboxStatus, 200, rm_email);
			} else {
				jsonDoc = day = card.getProperty("RM_CACHE", "");
				jsonObj = JSON.parse(jsonDoc);
				// xmlDoc=Base64.decode(rm_prefManager.getCharPref("extensions.rm4tb.cache."+rm_emailHash+".data"));
				pub.rm_render(jsonObj);
			}
		} else {
			// don't cache check
			window.setTimeout(pub.loadRapboxStatus, 200, rm_email);
		}
	}

	/**
	 * Called from WS call able to get access to response code after checking
	 * results for errors passes on to renderer
	 */
	pub.updateRMboxStatus = function() {
		var rm4tb = com.networklighthouse.rm4tb;
		var result = this.getResponseHeader("status");
		var response={};
		
		//need to check jStatus prior to json.parse
		
		responseTxt = this.responseText;
		try {
			response = JSON.parse(responseTxt);
		} catch(e){
			response.message="Rainmaker Error"
			response.status=result;
			dump(responseTxt);
		}
		jStatus = response.status;
		var r_name = document.getElementById('rm_name');
		var r_panel = document.getElementById('rainmaker-box');
		var r_rainmaker = document.getElementById('rm_rainmaker');
		var r_tooltip = document.getElementById('rm_tooltip');
		var p_name = null;
		var debug = pub.rm_prefManager.getBoolPref("extensions.rm4tb.test");
		if (jStatus != 200) {
			r_name.setAttribute("value", "FullContact didn't find any information" + " ("
					+ response.status + ")");
		} else {

			rm_cacheDays = pub.rm_prefManager
					.getIntPref("extensions.rm4tb.cacheDays");
			if (rm_cacheDays > 0) {
				// do cache
				var card = rm4tb.addressbook.cardForEmailAddress(this.rm_email);
				// check card exists
				if (card == null) {
					// create iff null
					card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
							.createInstance(Components.interfaces.nsIAbCard);
					card.primaryEmail = this.rm_email;
					rm4tb.addressbook.addCard(card);
				}
				rm4tb.updateCard(card, responseTxt, response);
			}
			pub.rm_render(response);
		}
	}

	pub.rm_render = function(jsonObj) {
		debugger;
		var r_name = document.getElementById('rm_name');
		var r_panel = document.getElementById('rain-box');
		var r_rainmaker = document.getElementById('rm_rainmaker');
		var r_tooltip = document.getElementById('rm_tooltip');
		var p_name = false;

		var debug = pub.rm_prefManager.getBoolPref("extensions.rm4tb.test");

		try {
			p_name = jsonObj.contactInfo.fullName;
		} catch (err) {
			p_name="FullContact didn't find any information";
		}
		
		r_rainmaker.setAttribute("status","on");
		
		// Setup tooltip
		var age;
		var gender;
		var location;
		try {
			age=jsonObj.demographics.age;
			gender=jsonObj.demographics.gender;
			location=jsonObj.demographics.locationGeneral; 
		} catch(e){
			age="?";
			gender="?";
			location="?";
		}
		var fields = [ p_name, age, gender, location];
		var name = pub.rm_getlstr("Name");
		var age = pub.rm_getlstr("Age");
		var gender = pub.rm_getlstr("Gender");
		var loc = pub.rm_getlstr("Location");
		var labels = [ name, age, gender, loc ];

		for (i = 0; i < fields.length; i++) {
			try {
				var value = fields[i];
				var tooltip = labels[i] + ": " + value;
				var desc = document.createElement("description");
				desc.setAttribute("value", tooltip);
				r_tooltip.appendChild(desc);
			} catch (err) {
				// do nothing
			}
		}

		// Now grab occupation details
		try {
			var occupations = jsonObj.organizations;
			for (i = 0; i < occupations.length; i++) {
				var occupation = occupations[i];

				try {
					var jtitle = occupation.title;
					var company = occupation.name;

					var desc = document.createElement("description");
					desc.setAttribute("value", jtitle + " at " + company);
					r_tooltip.appendChild(desc);
				} catch (err) {
					//debugger;
					// do nothing
				}

			}
		} catch (err) {
			debugger;
		}

		if (p_name == false) {
			p_name = pub.rm_getlstr("nameUnknown");
		}
		r_name.setAttribute("value", p_name);

		// Setup memberships
		var memberships = jsonObj.socialProfiles;
		var img_array = new Array();
		var img_elem = document.getElementById("rainmaker-image");
		var prefImageSrc = pub.rm_prefManager
				.getCharPref("extensions.rm4tb.imagePrefSrc");

		for (i = 0; i < memberships.length; i++) {
			var membership = memberships[i];
			if (membership.message) {
				// nothing
			} else {
				var site = membership.type.toLowerCase();
				;
				// XXX var is_member=
				// membership.attributes.getNamedItem('exists').nodeValue;
				var profile = membership.url;
				// XXX PROFILE IMAGES ARE A Different section var image_url=
				// membership.attributes.getNamedItem('image_url');

				var short_site = site;
				var site_panel = document.getElementById("rm_" + short_site);
				try {
					site_panel.setAttribute('status', 'on');
					site_panel.setAttribute('tooltiptext', profile);
					site_panel.setAttribute('oncommand',
							"com.networklighthouse.rm4tb.launchURL(\'"
									+ profile + "\')");
				} catch (err) {
					debugger;
					// not a predefined site, use auto create method, only need
					// to do this once per session as we will persist
					var pos = profile.indexOf("/", 9);
					var sitePrefix = profile.substring(0, pos);
					var lpos = sitePrefix.lastIndexOf("/") + 1;
					sitePrefix = sitePrefix.substring(lpos, sitePrefix.length);
					var favicon = "http://www.google.com/s2/u/0/favicons?domain="
							+ sitePrefix;
					newPanel = document.createElement("statusbarpanel");
					newPanel.setAttribute('id', "rm_" + short_site);
					newPanel.setAttribute('class', 'statusbarpanel-iconic rap');
					newPanel.setAttribute('src', favicon);

					newPanel.setAttribute('status', 'on');
					newPanel.setAttribute('tooltiptext', profile);
					newPanel.setAttribute('oncommand',
							"com.networklighthouse.rm4tb.launchURL(\'"
									+ profile + "\')");
					r_panel.appendChild(newPanel);
					// <statusbarpanel id="rm_twitter"
					// class="statusbarpanel-iconic rap"
					// src="chrome://rm4tb/content/images/twitter.com.ico"/>
					// do nothing
				}
			}

			/*
			 * XXX NOT HERE //Collect IMAGE if (image_url) { var
			 * image_url=membership.attributes.getNamedItem('image_url').nodeValue;
			 * if (image_url == "http://x.myspacecdn.com/images/no_pic.gif" ||
			 * image_url ==
			 * "http://static.twitter.com/images/default_profile.png"){
			 * //nothing } else { img_array[site]=image_url; } }
			 * //alert(prefImageSrc); if ((prefImageSrc=="facebookAPI") &&
			 * (site=='facebook.com')) { // get id from url p_url=new
			 * String(profile_url); p_length=p_url.length;
			 * p_seperator=p_url.lastIndexOf("=")+1;
			 * p_id=p_url.substring(p_seperator,p_length); //alert(p_id); //
			 * call facebook api params=new Array();
			 * params.push("fields=pic_square"); params.push("uid="+p_id); var
			 * sig=rm_xmlClient.getSignature(params,"ecb42d9b2980294ee4b90687df15ae8c");
			 * params.push("sig="+sig);
			 * rm_xmlClient.callMethod("users.getInfo",params,function(req){alert(req);}); }
			 */

		}

		var photos = jsonObj.photos;

		for (i = 0; i < photos.length; i++) {
			// XXX THIS IS BAD, will overload when there are multiple photos of
			// the same type...
			photo = photos[i];
			img_array[photo.type] = photo.url;
		}
		try {
			var image_site;
			for (key in img_array) {
				image_site = key;
			}

			if (typeof img_array[prefImageSrc] == "undefined") {
				// variable does not exist
			} else {
				image_site = prefImageSrc;
			}
			img_elem.setAttribute('src', img_array[image_site]);
		} catch (err) {
		}

	};

	pub.updateCard = function updateCard(card, responseTxt, response) {
		var dat = new Date();
		var minutes = 1000 * 60;
		var hours = minutes * 60;
		var days = hours * 24;
		var day = Math.floor(dat.getTime() / days);

		card.setProperty("RM_CACHE", responseTxt);
		card.setProperty("RM_CACHED_ON", day);
		try {
			card.displayName = response.contactInfo.fullName;
		} catch (e) {
			card.displayName = card.primaryEmail;
		}
		this.addressbook.modifyCard(card);
	}

	pub.rm_cleanup = function() {
		var r_panel = document.getElementById('rainmaker-box');
		var r_rainmaker = document.getElementById('rm_rainmaker');

		var list = document.getElementsByTagName('statusbarpanel');

		for (i = 0; i < list.length; i++) {
			list.item(i).setAttribute("status", "off");
		}
		// cleanup urlbox
		r_rainmaker.setAttribute('oncommand', "");
		// cleanup tooltip
		var r_tooltip = document.getElementById('rm_tooltip');
		var count = r_tooltip.childNodes.length;
		for (i = 0; i < count; i++) {
			r_tooltip.removeChild(r_tooltip.firstChild);
		}
		var image = document.getElementById("rainmaker-image");
		image.setAttribute('src', "");

		var r_name = document.getElementById('rm_name');
		r_name.setAttribute("value", pub.rm_getlstr("loading"));
		r_rainmaker.setAttribute("status","on");
	}

	pub.rm_cleanCache = function() {
		var obj;
		var children = pub.rm_cacheManager.getChildList(
				"extensions.rm4tb.cache.", {});
		var dat = new Date();
		var minutes = 1000 * 60;
		var hours = minutes * 60;
		var days = hours * 24;
		var today = Math.floor(dat.getTime() / days);
		// today
		rm_cacheDays = pub.rm_prefManager
				.getIntPref("extensions.rm4tb.cacheDays");
		// for (i=0;i<children.length;i++){
		// for (i=0;i<20;i++){
		for (i = 0; i < children.length; i++) {
			var branch = children[i];
			var cdata = pub.rm_cacheManager.getCharPref(branch);
			var adata = cdata.split(",");
			var day = parseInt(adata[0]);
			if ((day + rm_cacheDays) < today) {
				pub.rm_cacheManager.deleteBranch(branch);
			}
		}
	}

	pub.launchURL = function(url) {
		/* Remote browser */

		messenger = Components.classes['@mozilla.org/messenger;1']
				.createInstance(Components.interfaces.nsIMessenger);
		messenger.launchExternalURL(url);
	}

	pub.startup = function startup() {
		if (this.rm_prefManager.prefHasUserValue("extensions.rm4tb.key")) {
			// do nothing, already has an API KEY
		} else {
			// call api.networklighthouse.com/setuprm.php?q=rm4tb
			gXMLHttpRequest = new XMLHttpRequest();
			gXMLHttpRequest.onload = pub.updateRMapikey;
			gXMLHttpRequest.overrideMimeType('application/json');

			url = "http://api.networklighthouse.com/setupfc.php?q=fc4tb";
			debugger;
			// alert("CALLING "+url);
			gXMLHttpRequest.open("GET", url);
			gXMLHttpRequest.send(null);
		}
		var abManager = Components.classes["@mozilla.org/abmanager;1"]
				.getService(Components.interfaces.nsIAbManager);

		this.addressbook = abManager.getDirectory(this.addressBookURI);
	}

	pub.updateRMapikey = function() {
		try {
			var result = this.getResponseHeader("status");
			responseTxt = this.responseText;
			response = JSON.parse(responseTxt);

			if (response.apiKey) {
				com.networklighthouse.rm4tb.rm_prefManager.setCharPref(
						"extensions.rm4tb.key", response.apiKey);
			} else {
				com.networklighthouse.rm4tb.obj_dump(response);
				alert("FullContact Key fetch failed: see error console for details");
			}
		} catch (e) {
			alert("FullContact Key fetch failed: try again later");
		}
	}
	// XXX Initialisation code, needs to be moved to end
	window.setTimeout(pub.rm_backup, 5000);

	pub.rm_orgUpdateMsgHeaders = window.UpdateMessageHeaders;
	window.UpdateMessageHeaders = pub.rm_UpdateMessageHeaders;
	
	let hasConversations;
	try {
	  Components.utils.import("resource://conversations/hook.js");
	  hasConversations = true;
	} catch (e) {
	  hasConversations = false;
	}
    if (hasConversations)
	  registerHook({
	    onMessageStreamed: function (aMsgHdr, aDomNode) {
		  com.networklighthouse.rm4tb.rm_UpdateHeadersHdr(aMsgHdr);
	    },
	});

    
	pub.rm_cleanCache();
	pub.startup();
	return pub;
}();
