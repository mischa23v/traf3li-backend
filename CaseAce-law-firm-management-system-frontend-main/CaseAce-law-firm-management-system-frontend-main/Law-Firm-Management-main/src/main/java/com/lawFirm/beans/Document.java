package com.lawFirm.beans;

public class Document {
    
    private int id;
    private String name;
    private String format;
    private String path;
    private int caseId;

    public Document() {
    }

    public Document(int id, String name, String format, String path, int caseId) {
        this.id = id;
        this.name = name;
        this.format = format;
        this.path = path;
        this.caseId = caseId;
    }

    // Getters

    public int getID() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getFormat() {
        return format;
    }

    public String getPath() {
        return path;
    }

    public int getCaseID() {
        return caseId;
    }

    // Setters

    public void setID(int id) {
        this.id = id;
    }

    public void setCaseID(int caseId) {
        this.caseId = caseId;
    }

    public void setName(String name){
        this.name = name;
    }

    public void setFormat(String format){
        this.format = format;
    }

    public void setPath(String path){
        this.path = path;
    }

    @Override
    public String toString() {
        return "Document [id=" + id + ", name=" + name + ", format=" + format + ", path=" + path + ", caseId=" + caseId + "]";
    }
}
