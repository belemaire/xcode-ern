var fs = require('fs')
var path = require('path')

function pbxProjectFileUtils() {
  if (!(this instanceof pbxProjectFileUtils)) return new pbxProjectFileUtils()
}

const pbxProjSections = [
  'PBXBuildFile',
  'PBXContainerItemProxy',
  'PBXFileReference',
  'PBXFrameworksBuildPhase',
  'PBXGroup',
  'PBXHeadersBuildPhase',
  'PBXNativeTarget',
  'PBXProject',
  'PBXReferenceProxy',
  'PBXResourcesBuildPhase',
  'PBXSourcesBuildPhase',
  'PBXTargetDependency',
  'XCBuildConfiguration',
  'XCConfigurationList'
]

const beginSectionRe = (sectionName) => new RegExp(`\\\/\\\* Begin ${sectionName} section \\\*\\\/`)
const endSectionRe = (sectionName) => new RegExp(`\\\/\\\* End ${sectionName} section \\\*\\\/`)
const beginSectionStr = (sectionName) => `/* Begin ${sectionName} section */\n`
const endSectionStr = (sectionName) => `/* End ${sectionName} section */\n\n`
const objectsStartStr = `objects = {\n\n`

/**
 * Return the name of all missing sections from the pbxproj file
 * @param {*} pbxProjPath Path to the pbxproj file
 */
pbxProjectFileUtils.prototype.getMissingSections = function(pbxProjPath) {
  const pbxProjContent = fs.readFileSync(path.resolve(pbxProjPath)).toString()
  return pbxProjSections.filter(s => !beginSectionRe(s).test(pbxProjContent))
}

/**
 * A pbxproj file might not contain all sections. This cause a problem 
 * given that to add some object to a given section, the section must 
 * exist first in the pbxproj file, otherwise the xcode-ern pbxproj parser
 * won't create the section object in the first place.
 * This function acts as a pre-pass to create all missing sections in the
 * pbxproj file. Then the pbxproj can be parsed as usual through the
 * `project` function.
 * @param {} pbxProjPath Path to the pbxproj file
 */
pbxProjectFileUtils.prototype.addMissingSectionsToPbxProj = function(pbxProjPath) {
  const missingSections = this.getMissingSections(pbxProjPath)
  let pbxProjContent = fs.readFileSync(path.resolve(pbxProjPath)).toString()

  // Add all missing sections
  for (const missingSection of missingSections) {
    // We need to add sections in the correct positions in the pbxproj
    // file, as ordering of sections matters
    // To inject the missing section, we are just looking up at the name of 
    // the preceding section in the sections array and we add the missing
    // section at the end of the preceding one
    const idxOfMissingSection = pbxProjSections.indexOf(missingSection)
    let str = (idxOfMissingSection === 0) 
      ? objectsStartStr 
      : endSectionStr(pbxProjSections[idxOfMissingSection-1])
    const splitted = pbxProjContent.split(str)
    const reconstruct = [
      splitted[0],
      str,
      beginSectionStr(missingSection),
      endSectionStr(missingSection),
      splitted[1]
    ]
    pbxProjContent = reconstruct.join('')
  }

  fs.writeFileSync(path.resolve(pbxProjPath), pbxProjContent)
}

module.exports = pbxProjectFileUtils