import React, { useEffect, useRef, useState } from 'react'
import TabItem from './TabItem';
import './NavStyles.css';
import { createBrowserHistory } from 'history';
let history = createBrowserHistory();

const server = 'http://localhost:5000';
const getOrgsUrl = `${server}/organization`;
const getSectionsUrl = `${server}/section`;
const getDepartmentsUrl = `${server}/department`;
const getClassesUrl = `${server}/class`;

async function fetchRoutes(url) {
  let response = {};
    response = await fetch(url, {
      method: 'GET',
    })
    .then(response => (
      response.json()
    ))
    .catch(error => {
      console.log(error);
    })
    return response;
}

const NavBarAPI = {
  // get list of all registered student organizations in db
  getOrgs: async function() {
    let url = `${getOrgsUrl}`
    let response = await fetchRoutes(url);
    return response;
  },
  
  // get list of all departments in db
  getDepartments: async function() {
    let url = `${getDepartmentsUrl}`;
    let response = await fetchRoutes(url);
    return response;
  },

  // get list of all classes for a department in db
  getClass: async function(classId) {
    let url = `${getClassesUrl}/${classId}`;
    let response = await fetchRoutes(url);
    return response;
  },

  // get list of all sections for each class in db
  getSection: async function(sectionId) {
    let url = `${getSectionsUrl}/${sectionId}`;
    let response = await fetchRoutes(url);
    return response;
  }
}

// top level of the navbar
let topLevelNav = [
  { 
    id: 0, 
    name: "CLASSES", 
    children: []
  },
  { 
    id: 1, 
    name: "STUDENT ORGS", 
    children: [],
  }
]

/**
 * Hook that alerts clicks outside of the passed ref
 */
function useOutsideAlerter(ref, handleTabClick) {
  useEffect(() => {
      /**
       * Alert if clicked on outside of element
       */
      function handleClickOutside(event) {
          if (ref.current && !ref.current.contains(event.target)) {
              handleTabClick(1, "", -1);
          }
      }
      // Bind the event listener
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
          // Unbind the event listener on clean up
          document.removeEventListener("mousedown", handleClickOutside);
      };
  }, [ref, handleTabClick]);
}



export default function Navbar() {

  // arrays of arrays, each array is a deeper section
  const [sections, setSections] = useState([]);
  const [routeTree, setRouteTree] = useState([]);
  const [isTopNavShrunk, setIsTopNavShrunk] = useState(""); // is top nav shrunk
  const [activeItems, setActiveItems] = useState([]); // array of active list item indices

  // detect click outside
  const wrapperRef = useRef(null);
  useOutsideAlerter(wrapperRef, handleTabClick);

  // fill out tabs of the navbar
  useEffect(() => {
    async function fetchData() {
      let routeTree = [];
      routeTree = await buildRouteTree();
      setRouteTree(routeTree);
    }
    fetchData();
  }, []);

  async function buildRouteTree() {
    let routeTree = topLevelNav;

    // set all the class tab
    // get list of departments
    let departments = await NavBarAPI.getDepartments();
    departments = departments['departments'];

    // for each department get list of classes
    departments.forEach(async department => {
      let classes = [];

      // for each class get list of sections
      for await (let classId of department.classes) {
        let sections = [];
        let classData = await NavBarAPI.getClass(classId);

        // add sections to class's section lsit
        for await (let sectionId of classData.sections) {
          let sectionData = await NavBarAPI.getSection(sectionId);
          sections.push({ name: sectionData.section_id });
        }
        classes.push({ name: classData.name, sections: sections });
      }
      department.classes = classes;
    });

    // set departments field of route tree
    routeTree[0].children = departments;

    // set all the organization tabs
    let orgs = await NavBarAPI.getOrgs();
    orgs = orgs['organizations'];
    routeTree[1].children = orgs;
    return routeTree;
  }

  // open or collapse tabs
  function handleTabClick(id, name, depth) {

    // disable query if we click on the header
    if (id === 0) return;

    // set the row to be displayed
    let displayRow;
    switch(depth) {
      case -1: displayRow = []
      break;
      case 0: displayRow = routeTree[id - 1].children;
      break;
      case 1: displayRow = routeTree[activeItems[0].id].children[id - 1].classes;
      break;
      case 2: displayRow = routeTree[activeItems[0].id].children[activeItems[1].id].classes[id - 1].sections;
      break;
      default: displayRow = undefined;
    } 

    // check if query data returned a list
    if (displayRow === undefined) {
      console.log('leaf');
      // route to page
      let routeName = activeItems[activeItems.length - 1].name;
      history.push(`/${routeName}/${name}`);
      return;
    }

    // add selected section to new list
    displayRow = [{ id: 0, name: name}, ...displayRow];

    // set the state
    let updatedSections = [...sections];
    let updatedActiveItems = [...activeItems];

    updatedSections[depth] = displayRow;
    updatedSections.length = depth + 1;

    updatedActiveItems[depth] = { id: id - 1, name: name };
    updatedActiveItems.length = depth + 1;
    setSections(updatedSections);
    setActiveItems(updatedActiveItems);

    // shrink top level if there are more elements
    if (depth >= 0) setIsTopNavShrunk(true);
    else setIsTopNavShrunk(false);
  }

  // separate main tab from small tabs
  return (
    <nav id="navbar" ref={wrapperRef}>
      <ul id="top-nav" className={isTopNavShrunk ? "shrink" : ""}>
        {routeTree.map((listItem, index) => {
          let isActive = activeItems[0] === listItem.id ? true : false;
          return <TabItem 
            listItem={listItem}
            isActive={isActive}
            depth={0} 
            key={listItem.name} 
            id={index+1}
            handleTabItemClick={handleTabClick}/>
        })}
      </ul>

      {sections.map((list, index) => (
        <ul key={index+list[0].name} style={{ zIndex: 0 - index }}>
          {list.map((listItem, i) => {
            let isActive = false;
            console.log(activeItems[index + 1])
            console.log(i + 1);
            return <TabItem 
              listItem={listItem}
              isActive={isActive}
              depth={index+1} 
              id={i}
              key={listItem.name} 
              handleTabItemClick={handleTabClick}/>
          })}
        </ul>
      ))}
    </nav>
  )
}
