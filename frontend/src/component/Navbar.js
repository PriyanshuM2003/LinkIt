import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  makeStyles,
  Link,
} from "@material-ui/core";
import { useNavigate } from "react-router-dom";

import isAuth, { userType } from "../lib/isAuth";
import logoImg from "./logo2.png";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

const Navbar = (props) => {
  const classes = useStyles();
  const navigate = useNavigate();

  const handleClick = (location) => {
    console.log(location);
    navigate(location);
  };

  return (
    <AppBar
      position="fixed"
      background="transparent"
      style={{ backgroundColor: "#401d1d" }}
    >
      <Toolbar style={{ minHeight: "80px" }}>
        <Typography
          variant="h6"
          className={classes.title}
          style={{ fontSize: "32px", fontWeight: "800" }}
        >
          <Link href="/" underline="none" color="inherit">
            <img src={logoImg} width="170px" height="auto"></img>LinkIt
          </Link>
        </Typography>
        <div style={{ marginTop: "20px" }}>
          {isAuth() ? (
            userType() === "recruiter" ? (
              <>
                <Button color="inherit" onClick={() => handleClick("/home")}>
                  <Typography style={{ fontSize: "18px" }}>Home</Typography>
                </Button>
                <Button color="inherit" onClick={() => handleClick("/addjob")}>
                  <Typography style={{ fontSize: "18px" }}>Add Jobs</Typography>
                </Button>
                <Button color="inherit" onClick={() => handleClick("/myjobs")}>
                  <Typography style={{ fontSize: "18px" }}>Posted</Typography>
                </Button>
                <Button
                  color="inherit"
                  onClick={() => handleClick("/employees")}
                >
                  <Typography style={{ fontSize: "18px" }}>
                    Employees
                  </Typography>
                </Button>
                <Button color="inherit" onClick={() => handleClick("/profile")}>
                  <Typography style={{ fontSize: "18px" }}>Profile</Typography>
                </Button>
                <Button color="inherit" onClick={() => handleClick("/logout")}>
                  <Typography style={{ fontSize: "18px" }}>Logout</Typography>
                </Button>
              </>
            ) : (
              <>
                <Button color="inherit" onClick={() => handleClick("/home")}>
                  <Typography style={{ fontSize: "18px" }}>Home</Typography>
                </Button>
                <Button
                  color="inherit"
                  onClick={() => handleClick("/applications")}
                >
                  <Typography style={{ fontSize: "18px" }}>Applied</Typography>
                </Button>
                <Button color="inherit" onClick={() => handleClick("/profile")}>
                  <Typography style={{ fontSize: "18px" }}>Profile</Typography>
                </Button>
                <Button color="inherit" onClick={() => handleClick("/logout")}>
                  <Typography style={{ fontSize: "18px" }}>Logout</Typography>
                </Button>
              </>
            )
          ) : (
            <>
              <Button color="inherit" onClick={() => handleClick("/login")}>
                <Typography style={{ fontSize: "18px" }}>Login</Typography>
              </Button>
              <Button color="inherit" onClick={() => handleClick("/signup")}>
                <Typography style={{ fontSize: "18px" }}>SignUp</Typography>
              </Button>
            </>
          )}
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
